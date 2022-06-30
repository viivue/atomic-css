# Atomic CSS (private, beta)
> ⚛️ Customizable Atomic CSS Framework for everyone.

- 💡Inspirited by [Atomic CSS, Vì Một Thế Giới Hoà Bình](https://ehkoo.com/bai-viet/introduction-to-functional-utility-first-atomic-css)
- 👀 Guided by [Stacks](https://stackoverflow.design/product/guidelines/using-stacks/)
- ✨ Build with [SCSS](https://sass-lang.com/)

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

Compile compressed CSS

```shell
npm run prod
```