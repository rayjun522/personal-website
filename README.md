# 城市耕夫个人网站

## 构建与预览

使用 Node.js 20 或更高版本：

```sh
npm ci
npm run build
npx http-server docs
```

发布目录是 `docs/`。GitHub Pages 从 `master` 的 `/docs` 发布时，将构建后的 `docs` 和源码一起提交。Netlify 的 Git 部署通过 `netlify.toml` 自动构建、验证并发布 `docs`，手动部署仍可使用 `npm run deploy:netlify`。请通过 HTTP 预览 `docs`，不要只打开源码 HTML 来评估图片性能。

## 新增或替换照片

1. 将照片放入 `assets/`，并在根目录 `index.html` 中添加图片引用。
2. 执行 `npm run build`。
3. 检查 `docs/` 后发布。

构建使用现有的 sharp 自动生成 WebP，原照片保持在 `assets/` 中。相册生成最大宽度 480、960 的预览图（小照片不放大），列表通过 `srcset` 选择合适尺寸，点击放大后才请求现有的高清原图。现有相册原图已经限制在 1920 像素，直接保留可避免再次压缩损失细节。头像生成 200、400、560 像素版本。输出文件名包含原图片与编码配置的哈希，替换照片后会使用新地址。

项目详情中的相册地址在进入项目时才启用，并保留原生图片懒加载。视频设置 `preload="none"`，封面通过 `data-poster` 延后到进入项目时加载。首页文字不依赖 JavaScript 或入场动画才能显示。

`docs/` 是构建产物，每次构建都会重新生成，不要直接编辑。旧 `compress.js` 会覆盖原始 JPEG，新流程不需要运行它。

## 检查构建

```sh
npm run check
```

该检查验证生成图片的地址、实际像素尺寸、响应式候选图、高清图片、延后加载的封面以及全部相册的输出完整性。构建缺少照片或编码失败会直接报错。
