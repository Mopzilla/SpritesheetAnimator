## Spritesheet Animator by Mopzilla
[Visit on GitHub Pages](https://mopzilla.github.io/SpritesheetAnimator/)

### Have an Issue or Feature Suggestion?
Feel free to open an issue on GitHub, or contact me directly on Discord - my username is "mopzilla".
I most likely won't be doing major feature additions to this project though as I am busy with bigger projects, unless this site gets a lot of traction.

### Need Help?
This project was mostly made for personal-use, so there is a lack of instructions. I added placeholder text to the fields as a sort of hint. If you need more direct help though feel free to dm me on Discord at "mopzilla".

### Purpose of Spritesheet Animator
This tool was created to preview Realm of the Mad God spritesheets, as there isn't a viable way to view player or pet skins in-game. You can preview them by hovering in the store, but it doesn't always give a fair representation to gameplay. There are some skins with no in-game preview, like quest skins, where you would be reliant upon another user uploading footage of that skin.

### Want to Support me?
I would greatly appreciate my site being shared as it helps bring more attention to my work-in-progress portfolio on GitHub. If you spot someone who wants to know what a skin looks like, feel free to share the site to them or record the skin in question and upload it to them.

If you wish to support me financially [you can buy me a coffee](https://buymeacoffee.com/mopzilla), or you can [donate items to me on Steam](https://steamcommunity.com/tradeoffer/new/?partner=118170564&token=r085WqK9).

### Preset Configs for RotMG
Glory and Insight Skins
```
{"row_config":"5:36x36,1:68x36\n5:36x36,1:68x36\n5:36x36,1:68x36","action_ranges":"1-1:side_idle\n2-4:side_walk\n5-6:side_attack\n7-7:up_idle\n8-10:up_walk\n11-12:up_attack\n13-13:down_idle\n14-16:down_walk\n17-18:down_attack"}
```

Legion Skins
```
{"row_config":"4:36x36,1:68x36\n4:36x36,1:68x36\n4:36x36,1:68x36","action_ranges":"1-1:side_idle\n2-3:side_walk\n4-5:side_attack\n6-6:up_idle\n7-8:up_walk\n9-10:up_attack\n11-11:down_idle\n12-13:down_walk\n14-15:down_attack"}
```

Stellar Skins
```
{"row_config":"4:36x36,1:68x36\n4:36x36,1:68x36\n4:36x36,1:68x36","action_ranges":"1-1:side_idle\n2-3:side_walk\n4-5:side_attack\n6-6:up_idle\n7-8:up_walk\n9-10:up_attack\n11-11:down_idle\n12-13:down_walk\n14-15:down_attack"}
```

16x16 Pet Skins with 32x16 Attacks (Frames: 1 Idle, 4 Walk, 4 Attack)
```
{"row_config":"5:68x68,4:132x68","action_ranges":"1-1:side_idle\n2-5:side_walk\n6-9:side_attack"}
```

8x8 Player Skins with 16x8 Attacks (Frames: 1 Idle, 4 Walk, 4 Attack)
```
{"row_config":"5:36x36,4:68x36\n5:36x36,4:68x36\n5:36x36,4:68x36","action_ranges":"1-1:side_idle\n2-5:side_walk\n6-9:side_attack\n10-10:up_idle\n11-14:up_walk\n15-18:up_attack\n19-19:down_idle\n20-23:down_walk\n24-27:down_attack"}
```

### Action Ranges for RotMG
I cannot offer preset configs for every skin because some skins have spritesheets that are pure abominations (syndicate assassin).

I can however offer preset action ranges specifically, because even the abominable spritesheets typically have consistent frame ranges.

For example most basic player skins have 1 idle frame, 2 walk frames, and 2 attack frames.

Once you have defined the spritesheet's rows and frames, you can most likely pull one of these action range configs to skip the most tedious part.


1 Idle, 4 Walk, 4 Attack
```
{"action_ranges":"1-1:side_idle\n2-5:side_walk\n6-9:side_attack\n10-10:up_idle\n11-14:up_walk\n15-18:up_attack\n19-19:down_idle\n20-23:down_walk\n24-27:down_attack"}
```
