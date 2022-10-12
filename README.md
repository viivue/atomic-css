# Atomic CSS

[![release](https://badgen.net/github/release/viivue/atomic-css/)](https://github.com/viivue/atomic-css/releases/latest)
[![minified](https://badgen.net/badge/minified/~11KB/cyan)](https://www.jsdelivr.com/package/gh/viivue/atomic-css)
[![jsdelivr](https://data.jsdelivr.com/v1/package/gh/viivue/atomic-css/badge?style=rounded)](https://www.jsdelivr.com/package/gh/viivue/atomic-css)
[![license](https://badgen.net/github/license/viivue/atomic-css/)](https://github.com/viivue/atomic-css/blob/main/LICENSE)

> ⚛️ Customizable Atomic CSS Framework for everyone.

- 💡Inspirited by [Atomic CSS, Vì Một Thế Giới Hoà Bình](https://ehkoo.com/bai-viet/introduction-to-functional-utility-first-atomic-css)
- 👀 Guided by [Stacks](https://stackoverflow.design/product/guidelines/using-stacks/)
- ✨ Build with [SCSS](https://sass-lang.com/)


We all might agree that Atomic CSS is a helpful tool for both FE and BE development. There's a lot of Atomic CSS 
frameworks out there (like [tailwindcss](https://tailwindcss.com/)), however, to **elevate the advantage of Atomic CSS**, while keeping
it in **as light-weight as possible**, and even **customizable** for each project, we have this project on the go.

## Contribute

This repo is under development, so if you want to give a hand then feel free to reach out to the [Road map](https://github.com/viivue/atomic-css/issues/1) or the [Issues tab](https://github.com/viivue/atomic-css/issues). 

## Usage

### Default

You can download the default Atomic CSS files in the [`/dist` folder](https://github.com/viivue/atomic-css/tree/main/dist).

### Customization

To add custom classes for a specific project, you will have to:

1. Clone this repo to your local machine.
2. Edit the `/scss/_config.scss`, you will find some example templates there.
3. Generate the new Atomic CSS by `npm run prod`.

## Deployment

Install `npm`

```shell
npm install
```

### Dev

Watch SCSS files, then compile to previewed CSS

```shell
npm run dev
```

### Prod

Compile compressed CSS for distribution.

> Check version at `_defs.scss` and `package.json`

```shell
npm run prod
```