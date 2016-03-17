var webpack = require("webpack");

module.exports = {
  entry: "./lib/client-browserstack-util.js",
  output: {
    path: "./lib/_patch",
    filename: "browserstack-util.js"
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      minimize: true,
      comments: false,
      compress: { warnings: false },
      sourceMap: false
    })
  ]
};
