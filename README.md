Intro
=====

A dodgeball game written in es6.

Structure
=========

`es6` source files are stored in `src/es6`. These can be compiled using
`gulp build:js`. The transpiled files are added to `app/js`, along with
corresponding sourcemaps.

When there are new files available, they can be inserted into
`app/index.html` with `gulp inject`. The files inserted thusly will
later be concatenated and minified for distribution. Use `gulp dist` to
do this. Files are put into `dist`.

Development
===========

For development purposes including live-reload, you can use
`gulp watch`.

## Vim Setup

If you want to have `vim` automatically recognize the `es6` file as
JavaScript, use the following command in your `.vimrc`.

```vimscript
au BufNewFile,BufRead *.es6 set filetype=javascript
```

Distribution
============

See the *Structure* section for some information. You can run

```bash
gulp dist
```

to create a distribution directory at `dist`.

