const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require('./models/listing.js');
const path = require('path')
const methodOverrirde = require("method-override")
const ejsMate = require('ejs-mate');
const wrapAsync = require('./utils/wrapAsync.js')
const ExpressError = require('./utils/ExpressError.js')
const {listingSchema, reviewSchema} = require('./schema.js');
const { Review } = require('./models/review.js');

app.set("view engine","ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverrirde("_method"))
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname, "/public")));
const MONGO_URL = 'mongodb://127.0.0.1:27017/wanderlust'

main().then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log(err);
});

async function main(){
    await mongoose.connect(MONGO_URL);
}


const validateListing = (req, res, next) => { 
    let { error } = listingSchema.validate(req.body);

    if (error){
        let errMsg = error.details.map((el)=> el.message).join(',');
        throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
};

const validateReview = (req, res, next) => { 
    let { error } = reviewSchema.validate(req.body);

    if (error){
        let errMsg = error.details.map((el)=> el.message).join(',');
        throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
};
app.get("/",(req, res) => {
    res.send("Hi, I am root");
});

//Index route
app.get('/listings', wrapAsync(async(req, res)=> {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings});
}));

app.get('/listings/new', wrapAsync(async(req, res)=> {
    res.render("listings/new.ejs");
}));

app.get('/listings/:id',wrapAsync(async(req, res)=> {
    const {id} = req.params;
    const listing = await Listing.findById(id).populate('reviews');
    res.render("listings/show.ejs", {listing});
}));

app.post('/listings', validateListing,
    wrapAsync(async(req, res, next)=> {

    const newListing = new Listing(req.body.listing);

    await newListing.save();

    res.redirect('/listings');
    } ));

app.get('/listings/:id/edit', wrapAsync(async (req, res)=> {
    const {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", {listing});
}));

app.put('/listings/:id', validateListing,
     wrapAsync( async (req, res)=> {
    if (!req.body.listing)
        {
            throw new ExpressError(400, "Send valid data for listing");
        }
    const {id} = req.params;
    await Listing.findByIdAndUpdate(id, {...req.body.listing});
    res.redirect(`/listings/${id}`);
}));

app.post('/listings/:id/reviews', validateReview,wrapAsync(async (req,res)=>{
    let listing = await Listing.findById(req.params.id);

    const newReview = new Review(req.body.review);

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    res.redirect('/listings');
}));
app.delete('/listings/:id', wrapAsync(async (req, res)=> {
    const {id} = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
}));
// app.get("/testing", async (req, res)=> {
//     let listing = new Listing({
//         title:"a",
//         description:"b",
//         price:5,
//         location:"hyderabad",
//         country:"India"
//     });

//     await listing.save();
//     console.log('saved a new listing to db');
//     res.send('saved');

// })

app.all('/*splat',(req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next)=> {
    let { statusCode = 500,message = "Something went wrong!"} = err;
    res.status(statusCode).render("error.ejs",{message});
});

app.listen(8080,()=>{
    console.log("Server is listening to port 8080");
})
