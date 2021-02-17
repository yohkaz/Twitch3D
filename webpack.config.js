const path = require('path');

module.exports = {
  entry: ['./src/scene.js', './src/Stream.js', './src/overlay.js'],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
  },
};
