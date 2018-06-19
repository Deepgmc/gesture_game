var path = require('path');

module.exports = {

   entry: path.resolve(__dirname, 'src') + '/index.js',
   output: {
      path: path.resolve(__dirname, 'public'),
      filename: 'bundle.js',
      publicPath: '/public/'
   },
   module: {
      loaders: [
         {
            test: /\.js$/,
            include: path.resolve(__dirname, 'src'),
            loader: 'babel-loader',
            query: {
               presets: ['react', 'es2015']
            }
         },
         {
            test: /\.css$/,
            loader: 'style-loader!css-loader'
         }
      ]
   }
};