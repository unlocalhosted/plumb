### Hover stylesheet reconciliation

All 22 source-glob docs stylesheets with positive ':hover' declaration conditions are below. Counts are declaration/selector contexts, not unique physical declarations: a comma selector produces separate contexts. No habit judgement runs in Layer 2.

| Docs stylesheet (under apps/docs/src) | Hover declarations | With (hover: hover) | With (pointer: fine) | With both | With neither | Crude grep says ungated |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| kds.css | 37 | 5 | 5 | 5 | 32 | no |
| pages/icon-detail.css | 2 | 0 | 0 | 0 | 2 | yes |
| pages/icon-library.css | 1 | 0 | 0 | 0 | 1 | yes |
| pages/library.css | 11 | 0 | 0 | 0 | 11 | yes |
| ui/edit/edit.css | 4 | 0 | 0 | 0 | 4 | yes |
| ui/icon-cell.css | 3 | 0 | 0 | 0 | 3 | yes |
| ui/xray/checkbox-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/chip-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/dialog-specimens.css | 1 | 0 | 0 | 0 | 1 | yes |
| ui/xray/folder-specimens.css | 4 | 0 | 0 | 0 | 4 | yes |
| ui/xray/icon-button-specimens.css | 1 | 0 | 0 | 0 | 1 | yes |
| ui/xray/kbd-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/lasso-specimens.css | 5 | 0 | 0 | 0 | 5 | yes |
| ui/xray/link-card-specimens.css | 7 | 0 | 0 | 0 | 7 | yes |
| ui/xray/menu-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/palette-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/snap-guides-specimens.css | 6 | 0 | 0 | 0 | 6 | yes |
| ui/xray/status-specimens.css | 3 | 0 | 0 | 0 | 3 | yes |
| ui/xray/swatch-specimens.css | 3 | 0 | 0 | 0 | 3 | yes |
| ui/xray/switcher-specimens.css | 10 | 0 | 0 | 0 | 10 | yes |
| ui/xray/toast-specimens.css | 4 | 0 | 0 | 0 | 4 | yes |
| ui/xray/tooltip-specimens.css | 4 | 0 | 0 | 0 | 4 | yes |

File-level grep reproduces **21 ungated stylesheets**. Declaration conditions identify **22 stylesheets with ungated hover**. The difference is 'kds.css': it contains gated rules and therefore passes the crude file test, while 32 hover declaration contexts have neither gate. Its 5 other hover contexts have both gates. There are no hover-only or pointer-only cases in this snapshot. All other 21 files agree with the crude claim.

### Inline literal reconciliation

Re-run grep equivalent (one line; numeric spelling or hex marker inside the simple object match):

```sh
rg -n 'style=\{\{[^}]*[0-9#][^}]*\}\}' apps/docs/src -g '*.{tsx,jsx,ts,js}'
```

Current pinned snapshot produces **236 matching lines containing 247 object matches**, rather than the historical **219**. Eleven additional matches share lines with other matched style attributes. The original exact expression/hit list was not saved, so the 17-line historical delta cannot honestly be assigned to individual old lines. A looser 'style={{.*[0-9#].*}}' matches 369 lines here because digits after the object also qualify; grep syntax materially affects the count. Neither figure measures literal values. The AST records **238 sites with at least one literal declaration on 231 physical lines**, out of 746 style attributes; 1361 declarations are opaque, including 177 fully opaque objects/spreads/keys.

| Category | Sites/matches | Layer 2 treatment |
| --- | ---: | --- |
| grep hit: runtime expression/call/index, opaque value | 58 | Known property retained with dynamic-value, or fully opaque object; later rules deferred. |
| grep hit: literal declaration lowered | 183 | Literal declarations retained; provenance/habits deferred. |
| grep hit: opaque object/spread/computed key | 6 | Known property retained with dynamic-value, or fully opaque object; later rules deferred. |
| literal missed by grep: multiline object | 5 | Literal declarations retained; provenance/habits deferred. |
| literal missed by grep: strings without numbers/hex | 22 | Literal declarations retained; provenance/habits deferred. |
| literal missed by grep: nested braces, casts or alternate spacing | 26 | Literal declarations retained; provenance/habits deferred. |
| literal missed by grep: one-hop const | 2 | Literal declarations retained; provenance/habits deferred. |

Every grep hit and every additional literal site is classified below. Locations include the style attribute column, so multiple attributes on one line remain distinct. Full text and lowered properties: [reconciliation JSON](bench/metalui/layer2.reconciliation.json). A Layer 2 pass here means the declaration was read, not that a future provenance rule accepts it.

#### grep hit: runtime expression/call/index, opaque value

- apps/docs/src/blocks/availability-picker/availability-picker.tsx: 371:9
- apps/docs/src/pages/components/ButtonSmartControls.tsx: 79:47, 80:46, 81:50, 81:184, 118:297
- apps/docs/src/pages/foundations/Motion.tsx: 269:77, 270:79
- apps/docs/src/pages/foundations/Radius.tsx: 71:9, 150:96, 151:96
- apps/docs/src/ui/LayerSorter.tsx: 184:13
- apps/docs/src/ui/doc.tsx: 154:108, 269:118
- apps/docs/src/ui/xray/ButtonSpecimens.tsx: 120:90, 316:52, 317:16
- apps/docs/src/ui/xray/CheckboxSpecimens.tsx: 84:84
- apps/docs/src/ui/xray/ChipXray.tsx: 157:38
- apps/docs/src/ui/xray/DialogSpecimens.tsx: 273:117
- apps/docs/src/ui/xray/DialogXray.tsx: 257:53, 258:48
- apps/docs/src/ui/xray/FieldSpecimens.tsx: 125:45, 129:85, 130:90
- apps/docs/src/ui/xray/FolderSpecimens.tsx: 143:13, 236:13, 282:13
- apps/docs/src/ui/xray/IconButtonSpecimens.tsx: 115:42, 116:27, 204:86
- apps/docs/src/ui/xray/KbdSpecimens.tsx: 50:355, 50:1353
- apps/docs/src/ui/xray/LassoSpecimens.tsx: 64:13
- apps/docs/src/ui/xray/LassoXray.tsx: 50:37
- apps/docs/src/ui/xray/LinkCardSpecimens.tsx: 142:52, 143:18, 188:51, 344:46, 345:52
- apps/docs/src/ui/xray/MenuSpecimens.tsx: 218:89
- apps/docs/src/ui/xray/PaletteSpecimens.tsx: 414:99
- apps/docs/src/ui/xray/PaletteXray.tsx: 137:52
- apps/docs/src/ui/xray/SliderSpecimens.tsx: 105:45
- apps/docs/src/ui/xray/SnapGuidesSpecimens.tsx: 115:58
- apps/docs/src/ui/xray/StatusSpecimens.tsx: 147:83, 150:146, 304:17
- apps/docs/src/ui/xray/SwatchSpecimens.tsx: 47:651, 97:355
- apps/docs/src/ui/xray/SwitchSpecimens.tsx: 150:84, 151:77
- apps/docs/src/ui/xray/SwitcherSpecimens.tsx: 112:50, 118:51, 120:66
- apps/docs/src/ui/xray/ToolbarSpecimens.tsx: 303:141, 377:48
- apps/docs/src/ui/xray/TooltipSpecimens.tsx: 278:84

#### grep hit: literal declaration lowered

- apps/docs/src/pages/Home.tsx: 46:17, 52:16, 56:17, 62:16
- apps/docs/src/pages/components/Button.tsx: 254:102, 261:44
- apps/docs/src/pages/components/Checkbox.tsx: 58:90, 77:49
- apps/docs/src/pages/components/CheckboxGroup.tsx: 43:84, 52:46
- apps/docs/src/pages/components/Fan.tsx: 47:80
- apps/docs/src/pages/components/Field.tsx: 19:62, 20:20
- apps/docs/src/pages/components/Folder.tsx: 39:34, 41:49, 43:34, 110:9, 124:14, 154:65
- apps/docs/src/pages/components/IconButton.tsx: 18:53
- apps/docs/src/pages/components/Kbd.tsx: 53:55
- apps/docs/src/pages/components/LineHandles.tsx: 22:7, 27:33
- apps/docs/src/pages/components/NumberField.tsx: 41:74, 54:73
- apps/docs/src/pages/components/PerfectPreview.tsx: 213:7, 224:33
- apps/docs/src/pages/components/Radio.tsx: 46:42, 61:60
- apps/docs/src/pages/components/Region.tsx: 152:9
- apps/docs/src/pages/components/Select.tsx: 16:34, 43:78
- apps/docs/src/pages/components/SelectionFrame.tsx: 81:9
- apps/docs/src/pages/components/Settings.tsx: 13:10
- apps/docs/src/pages/components/Spinner.tsx: 110:38, 111:50, 133:48
- apps/docs/src/pages/components/Swatch.tsx: 17:18, 18:146
- apps/docs/src/pages/components/Switch.tsx: 16:51
- apps/docs/src/pages/components/Toggle.tsx: 36:75, 70:59
- apps/docs/src/pages/foundations/Materials.tsx: 15:41
- apps/docs/src/ui/AssistLab.tsx: 344:46
- apps/docs/src/ui/ConnectorLab.tsx: 53:46
- apps/docs/src/ui/FarCanvas.tsx: 32:66, 55:12, 85:42, 86:42
- apps/docs/src/ui/FolderUnfold.tsx: 87:34, 89:49, 91:34, 247:56, 251:53, 254:75, 258:16, 264:26, 272:16, 273:65, 275:16, 276:16, 277:41, 283:28, 291:14, 294:20, 295:69, 298:18, 300:44, 310:31
- apps/docs/src/ui/InstrumentSpecimen.tsx: 23:90, 24:39, 26:82, 26:178, 27:72
- apps/docs/src/ui/LayerSorter.tsx: 45:64, 50:63, 71:52, 76:31, 82:31, 88:31
- apps/docs/src/ui/LetterPad.tsx: 79:9, 88:31
- apps/docs/src/ui/ObjectSpecimen.tsx: 20:72, 22:117, 22:193, 22:276, 23:31, 25:59, 25:124, 25:216, 29:31
- apps/docs/src/ui/PartSpecimen.tsx: 24:65, 25:81
- apps/docs/src/ui/SurfaceFieldDemo.tsx: 162:11
- apps/docs/src/ui/Wordmark.tsx: 72:46
- apps/docs/src/ui/doc.tsx: 44:25, 104:13, 115:43, 132:10, 133:57, 134:46, 134:92, 150:51, 267:75, 276:95
- apps/docs/src/ui/floating.tsx: 41:10, 72:33, 125:14
- apps/docs/src/ui/xray/ButtonSpecimens.tsx: 118:101, 119:90
- apps/docs/src/ui/xray/ButtonXray.tsx: 231:86
- apps/docs/src/ui/xray/CheckboxSpecimens.tsx: 83:95
- apps/docs/src/ui/xray/CheckboxXray.tsx: 212:48, 222:110
- apps/docs/src/ui/xray/ChipSpecimens.tsx: 267:86, 268:100
- apps/docs/src/ui/xray/ChipXray.tsx: 158:46, 166:108, 196:110
- apps/docs/src/ui/xray/DialogXray.tsx: 250:110
- apps/docs/src/ui/xray/FieldXray.tsx: 144:57, 222:45, 274:85
- apps/docs/src/ui/xray/FolderSpecimens.tsx: 91:57, 93:42
- apps/docs/src/ui/xray/FolderXray.tsx: 211:110
- apps/docs/src/ui/xray/IconButtonSpecimens.tsx: 203:86
- apps/docs/src/ui/xray/IconButtonXray.tsx: 108:60, 113:60, 159:21
- apps/docs/src/ui/xray/KbdSpecimens.tsx: 50:834, 50:1096
- apps/docs/src/ui/xray/KbdXray.tsx: 241:82
- apps/docs/src/ui/xray/LassoXray.tsx: 54:35, 75:56
- apps/docs/src/ui/xray/LinkCardXray.tsx: 169:110, 184:61, 185:61, 186:61
- apps/docs/src/ui/xray/MenuXray.tsx: 196:35, 200:32, 202:46, 229:110
- apps/docs/src/ui/xray/PaletteXray.tsx: 129:105, 143:85, 147:58
- apps/docs/src/ui/xray/SliderSpecimens.tsx: 107:54
- apps/docs/src/ui/xray/SliderXray.tsx: 220:45, 242:68, 259:82
- apps/docs/src/ui/xray/SnapGuidesSpecimens.tsx: 233:123, 268:130
- apps/docs/src/ui/xray/SnapGuidesXray.tsx: 60:58, 64:59, 68:45, 86:56
- apps/docs/src/ui/xray/StatusSpecimens.tsx: 180:34, 301:93, 302:91
- apps/docs/src/ui/xray/StatusXray.tsx: 203:34, 211:42, 237:110
- apps/docs/src/ui/xray/SwatchSpecimens.tsx: 47:412
- apps/docs/src/ui/xray/SwatchXray.tsx: 181:110, 190:67
- apps/docs/src/ui/xray/SwitchSpecimens.tsx: 153:78, 154:76
- apps/docs/src/ui/xray/SwitchXray.tsx: 87:132, 101:17
- apps/docs/src/ui/xray/SwitcherXray.tsx: 252:82
- apps/docs/src/ui/xray/ToastSpecimens.tsx: 154:45, 260:88, 261:100
- apps/docs/src/ui/xray/ToastXray.tsx: 238:110, 277:82
- apps/docs/src/ui/xray/ToolbarXray.tsx: 128:45, 140:58, 195:82
- apps/docs/src/ui/xray/TooltipXray.tsx: 214:18
- apps/docs/src/ui/xray/WordmarkXray.tsx: 56:95, 111:62, 119:68
- apps/docs/src/ui/xray/kit.tsx: 274:40

#### grep hit: opaque object/spread/computed key

- apps/docs/src/ui/xray/SliderXray.tsx: 232:73
- apps/docs/src/ui/xray/SwitcherSpecimens.tsx: 105:229
- apps/docs/src/ui/xray/ToastXray.tsx: 257:75, 268:105
- apps/docs/src/ui/xray/ToolbarXray.tsx: 152:76, 173:73

#### literal missed by grep: multiline object

- apps/docs/src/pages/components/Folder.tsx: 141:15
- apps/docs/src/pages/components/SelectionFrame.tsx: 86:11
- apps/docs/src/pages/foundations/Radius.tsx: 123:15
- apps/docs/src/pages/foundations/Sizing.tsx: 54:21
- apps/docs/src/ui/Wordmark.tsx: 55:7

#### literal missed by grep: strings without numbers/hex

- apps/docs/src/pages/components/LineHandles.tsx: 29:96
- apps/docs/src/pages/components/Spinner.tsx: 130:175
- apps/docs/src/pages/foundations/Spacing.tsx: 99:103
- apps/docs/src/ui/AssistLab.tsx: 345:37
- apps/docs/src/ui/ConnectorLab.tsx: 55:87
- apps/docs/src/ui/FolderUnfold.tsx: 259:127, 266:81
- apps/docs/src/ui/InkCanvas.tsx: 79:37
- apps/docs/src/ui/SnapCanvas.tsx: 98:7
- apps/docs/src/ui/floating.tsx: 207:30, 309:59
- apps/docs/src/ui/xray/IconButtonXray.tsx: 103:17, 115:39
- apps/docs/src/ui/xray/KbdXray.tsx: 201:110
- apps/docs/src/ui/xray/LinkCardSpecimens.tsx: 77:54, 378:28
- apps/docs/src/ui/xray/PaletteSpecimens.tsx: 171:31
- apps/docs/src/ui/xray/StatusSpecimens.tsx: 52:57
- apps/docs/src/ui/xray/ToolbarSpecimens.tsx: 244:37, 376:37
- apps/docs/src/ui/xray/TooltipXray.tsx: 234:27, 243:45

#### literal missed by grep: nested braces, casts or alternate spacing

- apps/docs/src/pages/components/Spinner.tsx: 62:5
- apps/docs/src/pages/components/Textarea.tsx: 65:10
- apps/docs/src/pages/components/ToolStrip.tsx: 49:66
- apps/docs/src/pages/components/Weather.tsx: 136:5
- apps/docs/src/pages/foundations/Elevation.tsx: 109:13
- apps/docs/src/ui/FolderUnfold.tsx: 270:48, 292:50, 293:18
- apps/docs/src/ui/Wordmark.tsx: 42:11
- apps/docs/src/ui/xray/ButtonXray.tsx: 239:91
- apps/docs/src/ui/xray/CheckboxXray.tsx: 247:82
- apps/docs/src/ui/xray/ChipXray.tsx: 168:74
- apps/docs/src/ui/xray/FieldXray.tsx: 259:82
- apps/docs/src/ui/xray/FolderSpecimens.tsx: 188:13
- apps/docs/src/ui/xray/IconButtonXray.tsx: 101:60, 119:74
- apps/docs/src/ui/xray/KbdXray.tsx: 227:82
- apps/docs/src/ui/xray/LassoXray.tsx: 55:52
- apps/docs/src/ui/xray/MenuXray.tsx: 198:17
- apps/docs/src/ui/xray/SliderSpecimens.tsx: 45:43
- apps/docs/src/ui/xray/SliderXray.tsx: 244:55
- apps/docs/src/ui/xray/StatusXray.tsx: 213:74
- apps/docs/src/ui/xray/SwatchXray.tsx: 189:67, 207:82
- apps/docs/src/ui/xray/SwitcherXray.tsx: 229:82
- apps/docs/src/ui/xray/ToolbarXray.tsx: 183:82

#### literal missed by grep: one-hop const

- apps/docs/src/pages/foundations/Elevation.tsx: 86:71
- apps/docs/src/ui/xray/PaletteSpecimens.tsx: 162:76
