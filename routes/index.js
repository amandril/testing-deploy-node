const express = require('express');
const router = express.Router();
const h = require('../helpers');
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

const { catchErrors }  = require('../handlers/errorHandlers'); // destructuring, allows us to import just the one object from errorHandlers

router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
router.get('/add', authController.isLoggedIn, storeController.addStore);
router.get('/store/:slug', catchErrors(storeController.showStore));

router.post('/add',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);

router.post('/add/:id', 
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore));

router.get('/stores/:id/edit', catchErrors(storeController.editStore));

router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));
router.get('/top', catchErrors(storeController.getTopStores));

// // Do work here
// router.get('/', (req, res) => { // req has all the information, res has all the methods for sending the data back
//   const wes = { name: 'Wes', age: 100, cool: true };
//   // res.send('Hey! It works!');
//   // res.json(wes); // renders out a json element formatted as json
//   // res.json(req.query); // req.query gets the query parameters
//   // res.render('hello'); // renders out a template for us

//   res.render('hello', { // how to pass information from the route to the template file
//   	name: 'Wes',
//   	dog: req.query.dog,
//     title: 'I love food',
//     timeStamp: h.moment().format('LTS')
//   });

// });

// router.get('/reverse/:name', (req, res) => {
// 	const reverse = [...req.params.name].reverse().join('');
// 	res.send(reverse);
// });

router.get('/login', userController.loginForm); // Create one controller for every specific area of your website

router.post('/login', authController.login);

router.get('/register', userController.registerForm);

// 1. Validate the registration data
// 2. Register the user
// 3. We need to log them in
router.post('/register', 
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token', 
  authController.confirmedPasswords,
  catchErrors(authController.update)
);


router.get('/map', storeController.mapPage);

// API ENDPOINT

router.get('/api/v1/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near/v1', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.viewHearts));

// Reviews
router.post('/review/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));


module.exports = router;

// req.body for posted parameters
// req.params to access the things in the url