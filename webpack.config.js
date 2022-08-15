module.exports = {
    output: {
      filename: 'my-first-webpack.bundle.js',
    },
    module: {
        rules: [
            {
            test: /\.(png|jpe?g|gif|glb|gltf)$/i,
            loader: 'file-loader',
            options: {
                publicPath: './Modelos_glb',
                name: '[name].[ext]'
            },
            }
        ]
    },
  };