# 2zer011 slide

Web tĩnh trên GitHub Pages: `index.html` là thư viện, bài nằm trong `decks/`.

## Đưa lên GitHub Pages
1. Đẩy toàn bộ thư mục lên nhánh `main`.
2. Settings → Pages → Deploy from a branch → `main` / (root).
3. Vào `https://<user>.github.io/<repo>/`.

## Thêm bài mới (cách nhanh)
1. Copy `decks/trai-dat-mat-troi.html` thành `decks/ten-bai.html`, sửa các `<section class="slide">`.
   - `.s` hiện khi vào slide, `.b` hiện từng bước mỗi lần bấm, `data-by` là chữ chân trang.
   - Slide nền tối: thêm class `dark`. Animation: `data-anim="ten"` + `Deck.anims.ten = {start, stop}`.
2. Chụp slide 1 làm ảnh bìa 640x360 vào `thumbs/ten-bai.jpg`.
3. Thêm 1 khối vào mảng `DECKS` đầu thẻ `<script>` trong `index.html`.

## Bài làm bằng công cụ khác (có CSS hiện đại)
`python3 tools/compat.py tools/originals/bai.html decks/bai.html`
Đổi CSS variables, `inset`, flex `gap`, `grid` sang dạng cũ và thêm shim cho IE11.

## Tương thích
- Engine `assets/deck.js|css` và hub viết ES5, không dùng CSS variables / grid / gap / inset.
- Mục tiêu: Chrome 49+, Firefox 52+, Edge, IE11. Windows 7: Chrome 109 hoặc Firefox ESR 115 chạy tốt.
- Chế độ nhẹ tự bật trên Windows XP/7 và máy ≤2 nhân (tắt nhiễu, mờ, hiệu ứng nền).
- Mới test trên Chromium. IE11 chưa test trên máy thật.
