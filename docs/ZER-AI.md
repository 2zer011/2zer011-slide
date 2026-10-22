# ZER — ngôn ngữ làm slide/phim 3D (đọc 1 lần là viết được)

Bạn là AI. Hãy viết **chỉ mã ZER** (không giải thích, không ``` ) khi được yêu cầu làm slide/phim. Dán kết quả vào Studio.

## Quy tắc vàng
1. Thụt lề **4 dấu cách** = lồng nhau. Dòng kết thúc bằng `:` mở khối con. Chú thích bắt đầu `//`.
2. Một dòng = một việc: `tên = giá trị` (hoặc `tên: giá trị`). Vector ghi `x, y, z` (hoặc `(x,y,z)` / `[x,y,z]`). Số đơn như `scale = 2` tự nhân ra cả 3 trục.
3. Hệ toạ độ: **Y hướng lên**, X sang phải, Z về phía người xem. Đơn vị tự do, màn hình thường rộng ~16 đơn vị ở khoảng cách camera 10.
4. Góc tính bằng **độ**. Thời gian tính bằng **giây** (`2s`, `500ms` đều được). `t` = giây kể từ lúc vào slide → dùng `t` để tự chuyển động: `rotate = 0, t*40, 0`.
5. Mọi giá trị đều có thể là **công thức** theo `t`: `position = cosd(t*60)*3, 0, sind(t*60)*3`.
6. Màu: `#fff`, `#ff8800`, `#ff880080` (alpha), tên (`red`, `gold`, `skyblue`), `rgb(255,0,0)`, `hsl(210,80,60)`.
7. Tên vật là tuỳ chọn nhưng cần khi muốn `animate` nó từ ngoài: `cube hop:`; chữ có thể ghi thẳng nội dung: `text tieude "Xin chào":`.
8. Đừng bịa thuộc tính: bên dưới là danh sách đầy đủ. Gõ sai Studio sẽ gợi ý "có phải …?".

## Khung chương trình
```
project:
    title = "Tên phim"
    autoplay = 1            // tự chuyển slide theo duration (kiểu phim)

def f(a, b) = a * b + 1     // hàm tự định nghĩa (tuỳ chọn)
let R = 3                   // hằng dùng chung (tuỳ chọn)

slide "Tên slide":
    background = #0b1020, #1d2b5a      // 1 màu hoặc 2 màu (gradient dọc)
    stars = 300                         // sao nền
    light = 0.4, 0.8, 0.6               // hướng sáng
    ambient = 0.38                      // sáng nền 0..1
    fog = #000, 10, 40                  // màu, bắt đầu, kết thúc
    vignette = 0.5                      // tối viền
    duration = 8s                       // dùng khi autoplay
    fade_in = 1s   fade_out = 1s        // (mỗi dòng một thuộc tính)
    transition = slide, 0.6s            // fade | slide | zoom | none

    camera:
        position = 0, 2, 10             // hoặc orbit = góc_ngang, góc_đứng, khoảng_cách
        look = 0, 0, 0
        fov = 50                        // mode = ortho + height = 10 cho chiếu song song
        roll = 0

    <vật thể...>
    animate ... 
```

## Vật thể: `kiểu [tên] ["chuỗi"]:` rồi các thuộc tính
Thuộc tính chung (mọi vật): `position` `rotate` (độ, quanh X,Y,Z) `scale` `color` `opacity` (0..1) `visible` (0/1) `reveal = n` (hiện ở lần bấm n) `until = n` (ẩn từ lần bấm n) `lit = 0` (tắt đổ bóng) `wire = no|yes|only` `wirecolor`.
Vật con thụt lề dưới một vật khác → kế thừa vị trí/xoay/tỉ lệ của cha (nhóm). `group` là vật rỗng chỉ để gom.

| kiểu | thuộc tính riêng (mặc định) |
|---|---|
| `cube` (`box`) | `size` 1 (hoặc `size = w, h, d`) |
| `sphere` | `radius` 1 · `detail` 10 |
| `cylinder` | `radius` 1 · `height` 2 · `detail` 24 |
| `cone` | `radius` 1 · `height` 2 · `detail` 24 |
| `torus` | `radius` 1.5 · `tube` 0.4 · `detail` 20 |
| `pyramid` | `size` 2 · `height` |
| `plane` / `rect` | `w` 4 · `h` 3 (hoặc `width`/`height`) · nếu có `src` thì thành ảnh |
| `circle` | `radius` 1 |
| `polygon` | `points = (x,y,0), (x,y,0), ...` (nằm trên mặt XY) |
| `extrude` | `points` như polygon · `depth` 1 |
| `lathe` | `profile = (r,y,0), (r,y,0)...` xoay quanh trục Y |
| `mesh` | `vertices = ...` · `faces = ...` (chỉ số, từ 0) |
| `line` | `points` hoặc `from`,`to` · `width` 3 · `color` · `glow = 1` · `arrow = 1` |
| `points` | `points = galaxy(1500, 8, 3)` · `size` 0.06 · `color` · `color2` (chuyển màu theo khoảng cách tâm) |
| `particles` | `count` 80 · `life` 3 · `speed` 2 · `spread` 1 · `gravity` 0 · `size` 0.07 · `color` · `color2` |
| `text` | nội dung (chuỗi sau tên hoặc `text = ...`) · `size` 0.6 · `align = left|center|right` · `bold` `italic` `font` `outline` `wrap` `lineheight` · `billboard = 1` luôn quay mặt về camera |
| `label` | như text nhưng luôn quay mặt về camera |
| `image` | `src = tên_ảnh` (ảnh đã nhập ở tab Ảnh) · `w` hoặc `h` (giữ tỉ lệ) · `detail` 6 · `flip` |
| `grid` | `n` 10 ô · `step` 1 · `color` · nằm trên mặt XZ |
| `axes` | `length` 3 |

Khối vị trí kiểu dài (tương đương `position = 1.9, 8.9, 9.9`):
```
    cube a:
        coordinates:
            X = 1.9473839
            Y = 8.948267282
            Z = 9.9382727
```

## Vòng lặp
```
    for i in 0..30:                 // 0..29 (không gồm đầu cuối), thêm "step 2" nếu cần
        sphere s{i}:                // {i} chèn vào tên
            position = cosd(i*12)*4, i*0.1, sind(i*12)*4
            color = hsl(i*12, 80, 60)
```
Tối đa 3000 lần lặp/vòng.

## Animation (hai cách)
**1) Công thức theo t** (đơn giản nhất, chạy mãi): `rotate = 0, t*30, 0` · `position = 0, bob(1, 0.3), 0` · `opacity = fade_in(t, 1, 1)` · `scale = 1 + 0.1*sin(t*4)`.

**2) Keyframe** — đặt trong vật (`animate this:`) hoặc ngoài slide (`animate tên:`; `animate camera:` để chạy camera):
```
    animate hop:
        at 0s:
            position = -4, 0, 0
        at 2s:
            position = 4, 0, 0
            ease = inout            // linear in out inout cubicout expoout backout elasticout bounceout sineinout
        at 4s:
            position = -4, 0, 0
        loop = 1                    // lặp   (pingpong = 1: đi rồi về, delay = 1s: chờ)
```
Chỉ thuộc tính có trong keyframe mới được nội suy (số, vector, màu).

## Bấm từng bước (thuyết trình)
`reveal = 1`, `reveal = 2` … → mỗi lần bấm → / Space hiện thêm. `until = 3` ẩn đi từ bước 3.

## Bố cục nhanh (copy được)
- Tiêu đề: `text tieude "…":` `position = 0, 3, 0` · `size = 0.9` · `align = center` · `color = #fff`
- Cảnh xoay quanh vật: `camera:` → `orbit = t*10, 20, 12`
- Nền không gian: `background = #02030a` · `stars = 400` · `vignette = 0.5`
- Tên cảnh phim: `autoplay = 1` ở project + `duration = 6s`, `fade_in`, `fade_out` ở mỗi slide.

## Biến & hàm có sẵn
Biến: `t` `time` `dt` `frame` `step` + biến `for`, `let`.
Toán: `sin cos tan asin acos atan atan2 sqrt pow abs floor ceil round min max clamp lerp map smoothstep mod hypot pi` · độ: `sind cosd tand deg rad`.
Sóng/thời gian: `saw tri square pulse wave pingpong loop bob spin blink after between fade_in fade_out tween shake`.
Ngẫu nhiên (ổn định): `rand rrange randint pick noise snoise fbm jitter`.
Vector: `vec add sub mul div dot cross vlen norm dist polar orbit_y sph`.
Màu: `rgb rgba hsl hsla gray mixc lighten darken alpha rainbow palette`.
Sinh điểm (cho `points`/`line`/`polygon`): `ring star spiral helix grid grid3 line_pts sphere_pts torus_pts galaxy scatter lissajous wave_pts curve shift scale_pts range count get`.
Chữ: `str fmt concat upper lower typewriter count_up pad` (vd `text = typewriter("Xin chào", t, 12)`).
Easing: `ease(t, "inout")`, `ease_in ease_out ease_inout ...`.
(Danh sách đầy đủ có chữ ký + ví dụ: tab "Hàm".)

## Lỗi thường gặp
- Thiếu `:` ở cuối dòng khai báo vật/khối.
- Thụt lề lệch (dùng đúng 4 dấu cách, không tab).
- Dùng `x = ` cho vector — hãy dùng `position = x, y, z` (X/Y/Z chỉ dùng trong khối `coordinates:`).
- Quên tên ảnh phải khớp tên đã nhập (tab Ảnh).
- Vật quá nhỏ/lớn: màn hình rộng ~16 đơn vị tại khoảng cách 10.

## Ví dụ đầy đủ
```
project:
    title = "Mở đầu"
    autoplay = 1

slide "Cảnh 1":
    background = #000, #0b1330
    stars = 400
    duration = 7s
    fade_in = 1.5s
    fade_out = 1s
    camera:
        position = 0, 0.5, 14
        look = 0, 0, 0
    animate camera:
        at 0s:
            position = 0, 0.5, 14
        at 7s:
            position = 0, 1.2, 4
            ease = inout
    particles bui:
        count = 300
        life = 5
        color = #7aa8ff
    text ten "ZER 011":
        size = 1.6
        align = center
        bold = 1
        opacity = fade_in(t, 1.5, 1.5)
    for i in 0..12:
        sphere v{i}:
            radius = 0.15
            color = hsl(i*30, 80, 60)
            position = cosd(i*30 + t*60)*3.5, sind(t*90 + i*40)*0.8, sind(i*30 + t*60)*3.5
```
