const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const User = mongoose.model('User');

const multerOptions = {
	// where will the file be stored once it's uploaded
	storage: multer.memoryStorage(),
	// what types of files are allowed
	fileFilter(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/');
		if (isPhoto) {
			next(null, true);
		} else {
			next({ message: `That filetype isn't allowed!`}, false);
		}
	}
};

exports.homePage = (req, res) => {
	console.log(req.name);
	req.flash('error', 'Something Happened');
	req.flash('info', 'Something Happened');
	req.flash('warning', 'Something Happened');
	req.flash('success', 'Something Happened');
	res.render('index');
};

// Show a single store using a provided id
exports.showStore = async (req, res, next) => {
	const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews') // running .populate on the end finds the actual document associated with the id and puts it into the data returned
	if (!store) {
		next();
		return;
	}
	res.render('singleStore', { store , title: store.name});
}

// Get tags
exports.getStoresByTag = async (req, res) => {
	const t = req.params.tag;
	const tagQuery = t || { $exists: true }; // if there is no tag, will fall back to -give me any store that has a tag property on it
	const tagsPromise = Store.getTagsList();
	const storesPromise = Store.find({ tags: tagQuery });
	const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
	res.render('tags', {tags, title: 'Tags', t, stores});
}

exports.addStore = (req, res) => {
	res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async(req, res, next) => {
	// check if there is no new file to resize
	if (!req.file) {
		next(); // skip to the next middleware
		return;
	}
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`;
	// now we resize
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO); // Can lookup all other functionality for jimp at its documentation
	await photo.write(`./public/uploads/${req.body.photo}`);
	// Once we have written the photo to our filesystem, keep going!
	next();
};

exports.createStore = async (req, res) => {
	req.body.author = req.user._id;
	const store = await (new Store(req.body)).save();
	req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
	res.redirect(`/store/${store.slug}`);
};

// Shows list of stores on homepage and on stores page
exports.getStores = async (req, res) => {
	const page = req.params.page || 1;
	const limit = 4;
	const skip = (page * limit) - limit;

	// 1. Query the database for a list of all stores
	const storesPromise = Store
		.find()	// returns a promise
		.skip(skip)
		.limit(limit)
		.sort({ created: 'desc' })

	const countPromise = Store.count();

	const [stores, count] = await Promise.all([storesPromise, countPromise]);

	const pages = Math.ceil(count / limit);
	if (!stores.length && skip) {
		req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. so I put you on page ${pages}`);
		res.redirect(`/stores/page/${pages}`);
		return;
	}

	res.render('stores', { title: 'Stores', stores, page, pages, count });
};

// Find a store by the id, query that store out of mongo, and render an edit form, populating with the mongo data
const confirmOwner = (store, user) => {
	if(!store.author.equals(user._id)) {
		throw Error('You must own a store in order to edit it!');
	}
};
exports.editStore = async (req, res) => {
	// 1. Query the database to find the store we clicked on
	const store = await Store.findOne({ _id: req.params.id });
	// 2. Confirm they are the owner of the store
	confirmOwner(store, req.user);
	// 3. Render out the edit form so the user can update their store
	res.render('editStore', { title: `Edit ${store.name}`, store });

};

exports.updateStore = async (req, res) => {
	// set the location data to be a point
	req.body.location.type = 'Point';
	// find and update the store
	const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true, // return the new store instead of the old one
		runValidators: true // forces our model to run our required validators again, not just upon creation of the object
	}).exec();
	req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store ➡</a>`);
	res.redirect(`/stores/${store._id}/edit`);
};

exports.searchStores = async (req, res) => {
	const stores = await Store
	// first find store that match
	.find({
		$text: {
			$search: req.query.q
		}
	},
	{
		score: { $meta: 'textScore' }
	})
	// then sort them
	.sort({
		score: { $meta: 'textScore' }
	})
	// then limit to only 5 results
	.limit(5);
	res.json(stores);
};

exports.mapStores = async (req, res) => {
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
	const q = {
		location: {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates
				},
				$maxDistance: 10000 // 10km
			}
		}
	};
	const stores = await Store.find(q).select('slug name description location photo').limit(10);
	res.json(stores);
};

exports.mapPage = (req, res) => {
	res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
	const hearts = req.user.hearts.map(obj => obj.toString());
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
	const user = await User.findByIdAndUpdate(req.user._id, { [operator]: { hearts: req.params.id }}, { new: true });
	res.json(user);
};

exports.viewHearts = async (req, res) => {
	const heartedStores = await Store.find( { _id: { $in: req.user.hearts } } );
	res.render('stores', { title: 'Hearted Stores', stores: heartedStores });
};

exports.getTopStores = async (req, res) => {
	const stores = await Store.getTopStores();
	res.render('topStores', { stores, title: '⭐ Top Stores!'});
}










