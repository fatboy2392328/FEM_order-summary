const currentTask = process.env.npm_lifecycle_event
const path = require('path')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const fse = require('fs-extra')
const { WebpackManifestPlugin } = require('webpack-manifest-plugin')

const postCSSPlugins = [
  require('postcss-import'),
  require('postcss-mixins'),
  require('postcss-simple-vars'),
  require('postcss-nested'),
  // If in the future the creator of the postcss-hexrgba package
  // releases an update (it is version 2.0.1 as I'm writing this)
  // then it will likely work with PostCSS V8 so you can uncomment
  // the line below and also install the package with npm.
  //require('postcss-hexrgba'),
  require('autoprefixer')
]

class RunAfterCompile {
  apply(compiler) {
    compiler.hooks.done.tap('Copy images', function() {
					fse.copySync('./scr/assets/images', './dist/assets/images');
					// fse.copySync('./scr/assets/images', './docs/assets/images'); //docs directory for github pages
				})
  }
}

let cssConfig = {
	test: /\.(s[ac]|c)ss$/i,
	use: ['css-loader?url=false', { loader: 'postcss-loader', options: { postcssOptions: { plugins: postCSSPlugins } } }, 'sass-loader'],
};

let pages = fse.readdirSync('./scr').filter(function(file) {
  return file.endsWith('.html')
}).map(function(page) {
  return new HtmlWebpackPlugin({
    filename: page,
    template: `./scr/${page}`
  })
})

let config = {
	entry: './scr/assets/scripts/App.js',
	plugins: pages,
	devtool: 'eval-cheap-source-map',
	module: {
		rules: [
			cssConfig,
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [['@babel/preset-env', { useBuiltIns: 'usage', corejs: 3, targets: 'defaults' }], '@babel/preset-react'],
						// presets: ['@babel/preset-react', '@babel/preset-env'],
					},
				},
			},
		],
	},
};

if (currentTask == 'dev') {
  cssConfig.use.unshift('style-loader')
  config.output = {
    filename: 'bundled.js',
    path: path.resolve(__dirname, 'app')
  }
  config.devServer = {
			onBeforeSetupMiddleware: function (devServer) {
				devServer.app.get('./scr/**/*.html', function (req, res) {
					res.json({ custom: 'response' });
				});
			},
			static: {
				directory: path.join(__dirname, './scr'),
			},
			compress: true,
			port: 3000, // default 8080
			host: '0.0.0.0',
		};
  config.mode = 'development'
}

if (currentTask == 'build') {
  config.module.rules.push({
			test: /\.js$/,
			exclude: /(node_modules)/,
			use: {
				loader: 'babel-loader',
				options: {
					presets: ['@babel/preset-env', '@babel/preset-react']
				},
			},
		});

  cssConfig.use.unshift(MiniCssExtractPlugin.loader)
  config.output = {
    filename: '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].js',
    path: path.resolve(__dirname, 'dist'),
    // path: path.resolve(__dirname, 'docs') //docs directory for github pages
  }
  config.mode = 'production'
  config.optimization = {
    splitChunks: {chunks: 'all'},
    minimize: true,
    minimizer: [`...`, new CssMinimizerPlugin()]
  }
  config.plugins.push(
			new CleanWebpackPlugin(),
			new MiniCssExtractPlugin({ filename: 'styles.[chunkhash].css' }),
			new WebpackManifestPlugin(),
			new RunAfterCompile()
		);
}

module.exports = config