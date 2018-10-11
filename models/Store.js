const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true, // trims the whitespace from either side of the name - data normalization
		required: 'Please enter a store name!' // passes true, also overrides the default mongo required error (ugly)
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	created: {
		type: Date,
		default: Date.now
	},
	location: {
		type: {
			type: String,
			default: 'Point'
		},
		coordinates: [{
			type: Number,
			required: 'You must supply coordinates!'
		}],
		address: {
			type: String,
			required: 'You must supply an address!'
		}
	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an author!'
	}
});

// Define our indexes

storeSchema.index({
	name: 'text',
	description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
	if(!this.isModified('name')) {
		next(); // skip it
		return; // stop this function from running
	}
	this.slug = slug(this.name);
	// Find other stores that have a slug of wes, wes-1, wes-2, etc
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
	const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
	if (storesWithSlug.length) { // if anything comes back..
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}

	next();
	// TODO make more resilient so slugs are unique
})

storeSchema.statics.getTagsList = function() {
	return this.aggregate([
		{ $unwind: '$tags' },
		{ $group: { _id: '$tags', count: { $sum: 1 } } },
		{ $sort: { count: -1 } }
	]);
};

storeSchema.statics.getTopStores = function() {
	return this.aggregate([ // Creating our own new document - what aggregations are for
		// Lookup Stores and populate their reviews
		{ $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' } },
		// filter for only items that have 2 or more reviews
		{ $match: { 'reviews.1': { $exists: true } } },
		// add the average reviews field
		{ $project: {
			photo: '$$ROOT.photo',
			name: '$$ROOT.name',
			reviews: '$$ROOT.reviews',
			slug: '$$ROOT.slug',
			averageRating: { $avg: '$reviews.rating' }
		} },
		// sort it by our new field, highest reviews first
		{ $sort: { averageRating: -1 } },
		// limit to at most 10
		{ $limit: 10 }
	]);
};

// find reviews where the stores _id property === the review's store property
storeSchema.virtual('reviews', {
	ref: 'Review', // What model to link?
	localField: '_id', // which field on the store?
	foreignField: 'store' // which field on the review?
});

function autoPopulate(next) {
	this.populate('reviews');
	next();
}

storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Store', storeSchema); // Give the model a name and pass the schema which describes what the data looks like
