const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
	text: {
		type: String,
		required: 'You must supply text!'
	},
	created: {
		type: Date,
		default: Date.now
	},
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an author!'
	},
	rating: {
		type: Number,
		min: 1,
		max: 5
	},
	store: {
		type: mongoose.Schema.ObjectId,
		ref: 'Store',
		required: 'You must supply a store!'
	}
});

function autopopulate(next) {
	this.populate('author');
	next();
}

reviewSchema.pre('find', autopopulate); // adds hooks, whenever someone runs a find query this will run autopopulate
reviewSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Review', reviewSchema);