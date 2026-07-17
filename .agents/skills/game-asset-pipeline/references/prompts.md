# Imagegen 提示词模板

## Chroma key 规则

- 从 `#FF00FF` 洋红、`#00FF00` 绿色、`#0000FF` 蓝色中选择与主体调色板距离最大的颜色。
- 将准确色值写入提示词和处理报告；主体、描边、发光和 UI 高光不得使用该颜色或近似色。
- 要求整张画布使用单一、均匀、无纹理的 key 色；禁止棋盘格、渐变、阴影、地面和环境光染色。

## Pixel/HD 单体

~~~text
Create one complete full-body [pixel-art/HD 2D] game character.
Canvas: [width]x[height]. Fixed orthographic game-asset view.
Character specification: [appearance, clothing, equipment, handedness].
Background: one perfectly uniform solid chroma-key color [CHROMA_HEX], edge to edge. The character must not use this color or a similar color.
Keep the complete silhouette inside the canvas with clean separation and no text, border, shadow plane, grid, gradient, checkerboard or extra objects.
~~~

## 四方向基准

~~~text
Create one 2x2 sprite sheet of the same character.
Exact order: top row front, right; bottom row back, left.
Keep identity, equipment side, clothing construction, body proportions, scale and foot baseline fixed.
Background: one perfectly uniform solid chroma-key color [CHROMA_HEX] across the entire canvas and all cells.
Exactly four complete sprites. No grid lines, captions, labels, shadows, gradients, checkerboard, duplicated characters or cropped pixels.
~~~

## 八方向对角补充

~~~text
Using the attached approved front/right/back/left character sheet as the only identity source, create exactly four diagonal views in one 4x1 sheet.
Exact order: front-right, back-right, back-left, front-left.
Each diagonal must visibly combine the adjacent cardinal views and remain distinguishable from a pure front, side or back view.
Keep handedness, asymmetric equipment, clothing construction, proportions, palette and foot baseline fixed. Every diagonal sprite must match the approved cardinal sprites' exact visible body height and visual scale; do not enlarge the diagonals to fill their cells.
Background: one perfectly uniform solid chroma-key color [CHROMA_HEX].
No grid lines, captions, labels, shadows, gradients, checkerboard, missing equipment, duplicates or cropped pixels.
~~~

## UI sheet

~~~text
Create a game UI component sheet containing exactly [count] reusable components: [list].
Background: one perfectly uniform solid chroma-key color [CHROMA_HEX], including empty holes inside frames and rings. Components must not use this color.
Each component must be visually separate with at least [padding] pixels of key-color space around it.
No overlapping elements, connecting shadows, labels outside components, mockup background, gradient background, checkerboard or device frame.
~~~

## 已有复杂背景移除

~~~text
Edit the attached image: preserve the subject exactly and replace the entire background with one perfectly uniform solid chroma-key color [CHROMA_HEX].
Remove floor shadows, halos, color spill and background fragments. Do not redesign the subject.
~~~

## 无缝纹理

~~~text
Create a tileable [pixel-art/HD] texture of [material].
The left/right and top/bottom edges must continue naturally.
No central focal object, lighting gradient, border, text or visible seam.
~~~

## 三层视差

分别生成相同尺寸的 background、midground、foreground，固定相同地平线、配色和光照方向。需要透明的中前景先使用冲突纯色背景生成，再 chroma-key；声明 horizontal scrolling。

## 动画

~~~text
Using the attached canonical character sheet, create one [cols]x[rows] sprite sheet for a looping [action] animation.
Frame order is left-to-right, top-to-bottom. Keep identity, equipment, scale, camera, foot baseline and palette fixed.
Background: one perfectly uniform solid chroma-key color [CHROMA_HEX] across every cell.
No grid lines, captions, gradient, checkerboard, motion blur, missing limbs, duplicated frames or cropped pixels.
~~~
