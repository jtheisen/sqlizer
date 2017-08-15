const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: [ './build/app.js' ],
  plugins: [
    new webpack.ProvidePlugin({
      Promise: 'es6-promise-promise'
    })
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.bundle.js'
  },
  node: {
    fs: "empty"
  }
};