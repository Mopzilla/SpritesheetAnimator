let game_canvas = document.getElementById('game-canvas');
let g_ctx = game_canvas.getContext('2d');
const viewer_canvas = document.getElementById('viewer-canvas');
const v_ctx = viewer_canvas.getContext('2d');
let sprite_sheet = new Image();
let slices = [];
let frames = [];
let animations = {};
let current_animation = null;
let current_index = 0;
let timer = 0;
let frame_delays = { walk: 250, idle: 250, attack: 250 };
let sprite_scale = 1;
let last_time = 0;
let char_x = 0;
let char_y = 0;
let speed = 1.25;
let keys = { w: false, a: false, s: false, d: false };
let last_direction = 'side';
let last_facing_left = false;
let facing_left = false;
let view_x = 0;
let view_y = 0;
let is_dragging = false;
let start_mouse_x = 0;
let start_mouse_y = 0;
let start_view_x = 0;
let start_view_y = 0;
let min_width = Infinity;
let min_height = Infinity;
let is_attacking = false;
let mouse_x = 0;
let mouse_y = 0;
let request_id = null;
let media_recorder = null;
let recorded_chunks = [];
let is_recording = false;
let is_file_upload = false;
let uploaded_file_name = '';
let is_file_loaded = false;

const supported_actions = ['up_walk', 'side_walk', 'down_walk', 'up_idle', 'side_idle', 'down_idle', 'up_attack', 'side_attack', 'down_attack'];
const DEFAULT_WALK_FRAME_DELAY = 250;
const DEFAULT_SPEED = 1.25;

const initial_canvas_width = document.getElementById('game-container').clientWidth;
const initial_canvas_height = document.getElementById('game-container').clientHeight;

const record_button = document.getElementById('record-button');
const view_button = document.getElementById('view-button');
const save_button = document.getElementById('save-button');
const recording_indicator = document.getElementById('recording-indicator');
const modal = document.getElementById('modal');
const recorded_video = document.getElementById('recorded-video');
const image_url_input = document.getElementById('image-url');
const image_input = document.getElementById('image-input');
const upload_button = document.getElementById('upload-button');
const clear_image_x = document.getElementById('clear-image-x');

game_canvas.width = initial_canvas_width;
game_canvas.height = initial_canvas_height;
viewer_canvas.width = document.getElementById('cheatsheet-container').clientWidth;
viewer_canvas.height = document.getElementById('cheatsheet-container').clientHeight;

upload_button.addEventListener('click', () => {
    image_input.click();
});

image_input.addEventListener('change', () => {
    if (image_input.files && image_input.files.length > 0) {
        is_file_upload = true;
        uploaded_file_name = image_input.files[0].name;
        image_url_input.disabled = true;
        image_url_input.placeholder = `Uploaded: ${uploaded_file_name}`;
        image_url_input.value = '';
        clear_image_x.style.display = 'block';
        update_recording_buttons();
    }
});

function clear_uploaded_image() {
    image_input.value = '';
    is_file_upload = false;
    is_file_loaded = false;
    uploaded_file_name = '';
    image_url_input.disabled = false;
    image_url_input.placeholder = 'Enter Image URL';
    image_url_input.value = '';
    clear_image_x.style.display = 'none';
    sprite_sheet.src = '';
    g_ctx.clearRect(0, 0, game_canvas.width, game_canvas.height);
    v_ctx.clearRect(0, 0, viewer_canvas.width, viewer_canvas.height);
    document.getElementById('spritesheet-dimensions').style.opacity = 0;
    update_recording_buttons();
}

function parse_segment(segment_str) {
    const parts = segment_str.split(':');
    const count = Number(parts[0]);
    const size = parts[1];
    const flag = parts[2] || '';
    const [width, height] = size.split('x').map(Number);
    const is_whitespace = flag === 'whitespace';
    return { count, width, height, is_whitespace };
}

function generate_frames(row_configs) {
    slices = [];
    frames = [];
    let frame_number = 1;
    let y = 0;

    for (const row_str of row_configs) {
        let x = 0;
        const segments = row_str.split(',').map(parse_segment);
        for (const segment of segments) {
            for (let i = 0; i < segment.count; i++) {
                const slice = {
                    x: x,
                    y: y,
                    width: segment.width,
                    height: segment.height,
                    is_whitespace: segment.is_whitespace
                };
                if (!slice.is_whitespace) {
                    slice.frame_number = frame_number++;
                    frames.push(slice);
                }
                slices.push(slice);
                x += segment.width;
            }
        }
        if (segments.length > 0) {
            y += segments[0].height;
        }
    }
}

function parse_actions(action_input) {
    animations = {};
    const lines = action_input.trim().split('\n').filter(line => line.trim());
    for (const line of lines) {
        const [ranges_str, action] = line.split(':').map(str => str.trim());
        if (!supported_actions.includes(action)) continue;
        const frame_nums = [];
        const range_parts = ranges_str.split(',');
        for (const part of range_parts) {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start_str, end_str] = trimmed.split('-');
                const start = Number(start_str);
                const end = Number(end_str);
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let i = start; i <= end; i++) {
                        frame_nums.push(i);
                    }
                }
            } else {
                const single = Number(trimmed);
                if (!isNaN(single)) {
                    frame_nums.push(single);
                }
            }
        }
        const anim_frames = frames.filter(f => frame_nums.includes(f.frame_number));
        if (anim_frames.length > 0) {
            let frame_delay;
            if (action.includes('_walk')) {
                frame_delay = frame_delays.walk;
            } else if (action.includes('_idle')) {
                frame_delay = frame_delays.idle;
            } else if (action.includes('_attack')) {
                frame_delay = frame_delays.attack;
            }
            animations[action] = {
                frames: anim_frames,
                loop: !action.endsWith('_attack'),
                name: action,
                frame_delay: frame_delay
            };
        }
    }
}

function draw_frame() {
    g_ctx.clearRect(0, 0, game_canvas.width, game_canvas.height);
    g_ctx.fillStyle = "#222";
    g_ctx.fillRect(0, 0, game_canvas.width, game_canvas.height);
    if (!current_animation || current_animation.frames.length === 0) return;

    g_ctx.imageSmoothingEnabled = false;
    const frame = current_animation.frames[current_index];
    const anchor_x = Math.floor(min_width / 2);
    const anchor_y = Math.floor(min_height / 2);
    const offset_x = -anchor_x;
    const offset_y = -frame.height + anchor_y;

    g_ctx.save();
    g_ctx.translate(Math.round(char_x), Math.round(char_y));
    if (facing_left) {
        g_ctx.scale(-1 * sprite_scale, sprite_scale);
    } else {
        g_ctx.scale(sprite_scale, sprite_scale);
    }
    g_ctx.drawImage(sprite_sheet, frame.x, frame.y, frame.width, frame.height, offset_x, offset_y, frame.width, frame.height);
    g_ctx.restore();
}

function draw_viewer() {
    v_ctx.clearRect(0, 0, viewer_canvas.width, viewer_canvas.height);
    if (sprite_sheet.src && sprite_sheet.complete && sprite_sheet.width > 0) {
        v_ctx.imageSmoothingEnabled = false;
        v_ctx.drawImage(sprite_sheet, -view_x, -view_y);
        v_ctx.strokeStyle = 'white';
        v_ctx.lineWidth = 1;
        v_ctx.setLineDash([5, 5]);
        v_ctx.font = 'bold 14px Arial';
        for (const slice of slices) {
            const rect_x = slice.x - view_x;
            const rect_y = slice.y - view_y;
            if (rect_x + slice.width > 0 && rect_x < viewer_canvas.width && rect_y + slice.height > 0 && rect_y < viewer_canvas.height) {
                v_ctx.strokeRect(rect_x + 0.5, rect_y + 0.5, slice.width - 1, slice.height - 1);
                if (!slice.is_whitespace && slice.frame_number) {
                    const text = slice.frame_number.toString();
                    const text_metrics = v_ctx.measureText(text);
                    const text_width = text_metrics.width;
                    const bg_x = rect_x + 4;
                    const bg_y = rect_y + 4;
                    const bg_width = text_width + 4;
                    const bg_height = 16;
                    v_ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    v_ctx.fillRect(bg_x, bg_y, bg_width, bg_height);
                    v_ctx.fillStyle = 'white';
                    v_ctx.fillText(text, bg_x + 2, bg_y + 12);
                }
            }
        }
        v_ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        for (const action in animations) {
            for (const frame of animations[action].frames) {
                const rect_x = frame.x - view_x;
                const rect_y = frame.y - view_y;
                if (rect_x + frame.width > 0 && rect_x < viewer_canvas.width && rect_y + frame.height > 0 && rect_y < viewer_canvas.height) {
                    v_ctx.fillRect(rect_x, rect_y, frame.width, frame.height);
                }
            }
        }
    }
}

function update_animation(delta) {
    timer += delta;
    if (timer >= current_animation.frame_delay) {
        current_index = (current_index + 1) % current_animation.frames.length;
        if (current_index === 0 && !current_animation.loop && !is_attacking) {
            switch_to_desired_animation();
        }
        timer -= current_animation.frame_delay;
    }
}

function get_desired_animation() {
    let vx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let vy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    let moving = vx !== 0 || vy !== 0;
    let dir = last_direction;
    let is_facing_left = last_facing_left;

    if (moving) {
        const has_horizontal = vx !== 0;
        const has_vertical = vy !== 0;
        if (has_horizontal) {
            dir = 'side';
            is_facing_left = vx < 0;
        } else if (has_vertical) {
            dir = vy < 0 ? 'up' : 'down';
            is_facing_left = false;
        }
        last_direction = dir;
        last_facing_left = is_facing_left;
    }

    return { name: dir + (moving ? '_walk' : '_idle'), facing_left: is_facing_left };
}

function switch_to_desired_animation() {
    const desired = get_desired_animation();
    let anim_name = desired.name;

    if (!animations[anim_name]) {
        switch (anim_name) {
            case "up_walk":
            case "down_walk":
                anim_name = "side_walk";
                break;
            case "up_idle":
            case "down_idle":
                anim_name = "side_idle";
                break;
        }
    } else {
        facing_left = desired.facing_left;
    }

    if (current_animation == animations[anim_name]) {
        return;
    }

    if (animations[anim_name]) {
        current_animation = animations[anim_name];
        current_index = 0;
        timer = 0;
    }
}

function update_movement() {
    let vx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let vy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    let move_vector = normalize_movement(vx, vy);

    char_x += move_vector.x * speed;
    char_y += move_vector.y * speed;

    char_x = ((char_x % game_canvas.width) + game_canvas.width) % game_canvas.width;
    char_y = ((char_y % game_canvas.height) + game_canvas.height) % game_canvas.height;
}

function normalize_movement(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) {
        return {x: 0, y: 0};
    }

    return {x: x / length, y: y / length};
}

function update_attack_direction() {
    const dx = mouse_x - char_x;
    const dy = mouse_y - char_y;
    let dir;
    let is_facing_left = false;
    if (Math.abs(dy) > Math.abs(dx)) {
        dir = dy < 0 ? 'up' : 'down';
    } else {
        dir = 'side';
        is_facing_left = dx < 0;
    }
    let desired_action = dir + '_attack';

    if (!animations[desired_action]) {
        desired_action = "side_attack";
    }

    if (animations[desired_action]) {
        if (current_animation.name !== desired_action) {
            current_animation = animations[desired_action];
            current_index = 0;
            timer = 0;
        }
        facing_left = is_facing_left;
    }
}

function export_config() {
    const config = {
        image_url: is_file_upload ? '' : image_url_input.value.trim(),
        row_config: document.getElementById('row-config').value.trim(),
        action_ranges: document.getElementById('action-ranges').value.trim(),
        frame_delays: {
            walk: Number(document.getElementById('walk-frame-delay').value) || 150,
            idle: Number(document.getElementById('idle-frame-delay').value) || 150,
            attack: Number(document.getElementById('attack-frame-delay').value) || 150
        },
        sprite_scale: Number(document.getElementById('sprite-scale').value) || 100
    };
    const config_string = "```" + JSON.stringify(config) + "```";
    navigator.clipboard.writeText(config_string).then(() => {
        alert('Configuration copied to clipboard!');
    }).catch(err => {
        alert('Failed to copy configuration to clipboard: ' + err);
    });
}

function import_config() {
    navigator.clipboard.readText().then(text => {
        try {
            let clean_text = text.trim();
            if (clean_text.startsWith("```")) {
                clean_text = clean_text.substring(3);
            }
            if (clean_text.endsWith("```")) {
                clean_text = clean_text.slice(0, -3);
            }

            const config = JSON.parse(clean_text.trim());

            if (typeof config !== 'object' || config === null) {
                throw new Error('Invalid configuration format: Must be a JSON object.');
            }
            if (config.image_url !== undefined && typeof config.image_url !== 'string') {
                throw new Error('Invalid imageUrl: Must be a string.');
            }
            if (config.row_config !== undefined && typeof config.row_config !== 'string') {
                throw new Error('Invalid rowConfig: Must be a string.');
            }
            if (config.action_ranges !== undefined && typeof config.action_ranges !== 'string') {
                throw new Error('Invalid actionRanges: Must be a string.');
            }
            if (config.frame_delays !== undefined) {
                if (typeof config.frame_delays !== 'object' || config.frame_delays === null) {
                    throw new Error('Invalid frameDelays: Must be an object.');
                }
                if (config.frame_delays.walk !== undefined && (typeof config.frame_delays.walk !== 'number' || config.frame_delays.walk < 1)) {
                    throw new Error('Invalid walk frame delay: Must be a number >= 1.');
                }
                if (config.frame_delays.idle !== undefined && (typeof config.frame_delays.idle !== 'number' || config.frame_delays.idle < 1)) {
                    throw new Error('Invalid idle frame delay: Must be a number >= 1.');
                }
                if (config.frame_delays.attack !== undefined && (typeof config.frame_delays.attack !== 'number' || config.frame_delays.attack < 1)) {
                    throw new Error('Invalid attack frame delay: Must be a number >= 1.');
                }
            }
            if (config.sprite_scale !== undefined && (typeof config.sprite_scale !== 'number' || config.sprite_scale < 1)) {
                throw new Error('Invalid spriteScale: Must be a number >= 1.');
            }

            if (config.image_url !== undefined && config.image_url !== '') {
                image_url_input.value = config.image_url;
            }
            if (config.row_config !== undefined && config.row_config !== '') {
                document.getElementById('row-config').value = config.row_config;
            }
            if (config.action_ranges !== undefined && config.action_ranges !== '') {
                document.getElementById('action-ranges').value = config.action_ranges;
            }
            if (config.frame_delays !== undefined) {
                if (config.frame_delays.walk !== undefined) {
                    document.getElementById('walk-frame-delay').value = config.frame_delays.walk;
                }
                if (config.frame_delays.idle !== undefined) {
                    document.getElementById('idle-frame-delay').value = config.frame_delays.idle;
                }
                if (config.frame_delays.attack !== undefined) {
                    document.getElementById('attack-frame-delay').value = config.frame_delays.attack;
                }
            }
            if (config.sprite_scale !== undefined) {
                document.getElementById('sprite-scale').value = config.sprite_scale;
            }

            image_input.value = '';
            is_file_upload = false;
            is_file_loaded = false;
            uploaded_file_name = '';
            image_url_input.disabled = false;
            image_url_input.placeholder = 'Enter Image URL';
            clear_image_x.style.display = 'none';
            sprite_sheet.src = '';
            g_ctx.clearRect(0, 0, game_canvas.width, game_canvas.height);
            v_ctx.clearRect(0, 0, viewer_canvas.width, viewer_canvas.height);
            document.getElementById('spritesheet-dimensions').style.opacity = 0;
            update_recording_buttons();
            alert('Configuration imported successfully!');
        } catch (err) {
            alert('Failed to import configuration: ' + err.message);
        }
    }).catch(err => {
        alert('Failed to read from clipboard: ' + err);
    });
}

function update_recording_buttons() {
    stop_recording();
    record_button.disabled = !is_file_loaded;
    view_button.disabled = !is_file_loaded || recorded_chunks.length === 0;
    save_button.disabled = !is_file_loaded || recorded_chunks.length === 0;
}

function toggle_recording() {
    if (!is_file_loaded) {
        alert('Recording is only available for images uploaded as files.');
        return;
    }
    if (!is_recording) {
        start_recording();
    } else {
        stop_recording();
    }
}

function start_recording() {
    if (!game_canvas.captureStream) {
        alert('Canvas recording is not supported in this browser.');
        return;
    }

    const stream = game_canvas.captureStream(60);
    media_recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorded_chunks = [];

    media_recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recorded_chunks.push(event.data);
        }
    };

    media_recorder.onstop = () => {
        const blob = new Blob(recorded_chunks, { type: 'video/webm' });
        recorded_video.src = URL.createObjectURL(blob);
        update_recording_buttons();
    };

    media_recorder.start();
    is_recording = true;
    record_button.textContent = 'Stop Recording';
    record_button.classList.add('recording');
    recording_indicator.style.display = 'block';
}

function stop_recording() {
    if (media_recorder && media_recorder.state !== 'inactive') {
        media_recorder.stop();
        is_recording = false;
        record_button.textContent = 'Start Recording';
        record_button.classList.remove('recording');
        recording_indicator.style.display = 'none';
    }
}

function view_recording() {
    if (!is_file_loaded) {
        alert('Recording is only available for images uploaded as files.');
        return;
    }
    if (recorded_video.src) {
        modal.style.display = 'flex';
        recorded_video.play();
    } else {
        alert('No recording available.');
    }
}

function save_recording() {
    if (!is_file_loaded) {
        alert('Recording is only available for images uploaded as files.');
        return;
    }
    if (recorded_video.src) {
        const blob = new Blob(recorded_chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const base_file_name = uploaded_file_name ? uploaded_file_name.replace(/\.[^/.]+$/, '') : 'recording';
        a.download = `${base_file_name}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        alert('No recording available.');
    }
}

function close_modal() {
    modal.style.display = 'none';
    recorded_video.pause();
}

function game_loop(timestamp) {
    if (!last_time) last_time = timestamp;
    const delta = timestamp - last_time;
    last_time = timestamp;

    if (is_attacking) {
        update_attack_direction();
    } else {
        if (current_animation && current_animation.loop) {
            switch_to_desired_animation();
        }
    }

    update_movement();
    update_animation(delta);
    draw_frame();

    request_id = requestAnimationFrame(game_loop);
}

function init_game() {
    char_x = game_canvas.width / 2;
    char_y = game_canvas.height / 2;
    current_animation = animations['side_idle'] || 
                       animations['down_idle'] || 
                       animations['up_idle'] || 
                       Object.values(animations)[0];
    if (current_animation) {
        current_index = 0;
        timer = 0;
        facing_left = false;
        last_direction = current_animation.name.startsWith('side') ? 'side' : 
                         current_animation.name.startsWith('down') ? 'down' : 
                         current_animation.name.startsWith('up') ? 'up' : 'side';
        last_facing_left = false;
        request_id = requestAnimationFrame(game_loop);
    }
}

async function load_spritesheet() {
    if (request_id) {
        cancelAnimationFrame(request_id);
        request_id = null;
    }

    if (is_recording) {
        stop_recording();
    }

    const new_canvas = document.createElement('canvas');
    new_canvas.id = 'game-canvas';
    new_canvas.width = initial_canvas_width;
    new_canvas.height = initial_canvas_height;
    const old_canvas = document.getElementById('game-canvas');
    const computed_styles = window.getComputedStyle(old_canvas);
    new_canvas.style.cssText = computed_styles.cssText;
    const game_container = document.getElementById('game-container');
    game_container.replaceChild(new_canvas, old_canvas);
    game_canvas = new_canvas;
    g_ctx = game_canvas.getContext('2d');

    game_canvas.addEventListener('mousemove', (e) => {
        const rect = game_canvas.getBoundingClientRect();
        mouse_x = e.clientX - rect.left;
        mouse_y = e.clientY - rect.top;
    });

    game_canvas.addEventListener('mousedown', (e) => {
        is_attacking = true;
        const rect = game_canvas.getBoundingClientRect();
        mouse_x = e.clientX - rect.left;
        mouse_y = e.clientY - rect.top;
        update_attack_direction();
    });

    sprite_sheet = new Image();
    slices = [];
    frames = [];
    animations = {};
    current_animation = null;
    current_index = 0;
    timer = 0;
    frame_delays = {
        walk: Number(document.getElementById('walk-frame-delay').value) || 250,
        idle: Number(document.getElementById('idle-frame-delay').value) || 250,
        attack: Number(document.getElementById('attack-frame-delay').value) || 250
    };
    sprite_scale = Number(document.getElementById('sprite-scale').value) / 100 || 1;
    speed = frame_delays.walk > 0 ? (DEFAULT_SPEED * DEFAULT_WALK_FRAME_DELAY) / frame_delays.walk : DEFAULT_SPEED;
    last_time = 0;
    char_x = 0;
    char_y = 0;
    keys = { w: false, a: false, s: false, d: false };
    last_direction = 'side';
    last_facing_left = false;
    facing_left = false;
    view_x = 0;
    view_y = 0;
    is_dragging = false;
    start_mouse_x = 0;
    start_mouse_y = 0;
    start_view_x = 0;
    start_view_y = 0;
    min_width = Infinity;
    min_height = Infinity;
    is_attacking = false;
    mouse_x = 0;
    mouse_y = 0;
    recorded_chunks = [];

    const url_input = image_url_input.value.trim();
    const row_config_input = document.getElementById('row-config').value.trim();
    const action_ranges_input = document.getElementById('action-ranges').value.trim();

    if (!image_input.files || image_input.files.length === 0 && !url_input && !row_config_input && !action_ranges_input) {
        return;
    }

    if (!image_input.files || image_input.files.length === 0 && !url_input) {
        alert('Please select an image file or enter an image URL.');
        return;
    }

    const row_configs = row_config_input.split('\n').filter(line => line.trim());
    const has_rows = row_configs.length > 0;
    const has_actions = action_ranges_input.length > 0;

    if (has_rows) {
        generate_frames(row_configs);
    }

    if (has_actions) {
        if (!has_rows) {
            alert('Row configurations are required for actions.');
            return;
        }
        parse_actions(action_ranges_input);
    } else if (has_rows) {
        animations['side_idle'] = {
            frames: frames,
            loop: true,
            name: 'side_idle',
            frame_delay: frame_delays.idle
        };
    }

    if (frames.length > 0) {
        min_width = frames.reduce((min, f) => Math.min(min, f.width), frames[0].width);
        min_height = frames.reduce((min, f) => Math.min(min, f.height), frames[0].height);
    }

    const load_image = () => {
        return new Promise((resolve, reject) => {
            sprite_sheet.onload = () => {
                document.getElementById('spritesheet-dimensions').textContent = `${sprite_sheet.width} x ${sprite_sheet.height}`;
                document.getElementById('spritesheet-dimensions').style.opacity = 1;
                view_x = 0;
                view_y = 0;
                draw_viewer();
                if (Object.keys(animations).length > 0) {
                    init_game();
                }
                update_recording_buttons();
                resolve();
            };
            sprite_sheet.onerror = () => {
                reject(new Error('Failed to load the spritesheet image. Please check the URL or file.'));
            };
        });
    };

    if (image_input.files && image_input.files.length > 0) {
        is_file_loaded = true;
        is_file_upload = true;
        uploaded_file_name = image_input.files[0].name;
        const file = image_input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            sprite_sheet.src = e.target.result;
            load_image().catch(err => alert(err.message));
        };
        reader.onerror = () => {
            alert('Failed to read the image file.');
        };
        reader.readAsDataURL(file);
    } else if (url_input) {
        is_file_loaded = false;
        is_file_upload = false;
        uploaded_file_name = '';
        clear_image_x.style.display = 'block';
        sprite_sheet.src = url_input;
        load_image().catch(err => alert(err.message));
    }
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
});

document.addEventListener('mouseup', () => {
    is_attacking = false;
    switch_to_desired_animation();
});

viewer_canvas.addEventListener('mousedown', (e) => {
    is_dragging = true;
    start_mouse_x = e.clientX;
    start_mouse_y = e.clientY;
    start_view_x = view_x;
    start_view_y = view_y;
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!is_dragging) return;
    const delta_x = e.clientX - start_mouse_x;
    const delta_y = e.clientY - start_mouse_y;
    view_x = Math.max(0, Math.min(start_view_x - delta_x, sprite_sheet.width - viewer_canvas.width));
    view_y = Math.max(0, Math.min(start_view_y - delta_y, sprite_sheet.height - viewer_canvas.height));
    draw_viewer();
});

document.addEventListener('mouseup', () => {
    is_dragging = false;
});