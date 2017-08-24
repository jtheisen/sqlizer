const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: [ './src/app.ts' ],
  devtool: 'source-map',
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"]
  },
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      Promise: 'es6-promise-promise'
    })
  ],
  output: {
    path: __dirname + '/dist',
    filename: 'app.bundle.js'
  }
  // node: {
  //   fs: "empty"
  // }
};