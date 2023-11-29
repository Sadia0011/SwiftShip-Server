const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.Stripe_Secret_Key);

const port=process.env.PORT || 5000;

const app=express();

// middleware
app.use(express.json())
app.use(cors())


const verifyJWT = (req, res, next) => {
  // console.log("inside verify token",req.headers)
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// /mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uok4zlq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db("swiftship").collection("users");
    const BookingParcelCollection = client.db("swiftship").collection("bookingParcel");
    const PaymentCollection = client.db("swiftship").collection("payment");
// jwt related api
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res.send({ token });
});



// user related api
    app.get("/users",async(req,res)=>{
      
      const result=await usersCollection.find().toArray();
      res.send(result)
    })

app.post("/users",async(req,res)=>{
  const user=req.body;
  console.log(user)
    const query={email:user.email}
    const existingUser=await usersCollection.findOne(query)
    if(existingUser){
      return res.send({message:"user already exists",insertedId:null})
    }
    const result=await usersCollection.insertOne(user)
    console.log(result)
    res.send(result)
})

// check user is admin or not
app.get("/users/admin/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res
        .status(403)
        .send({message: "forbidden access" });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let admin=false
  if(user){
    admin=user?.role === "admin" ;
  }
  res.send({admin});
});
// check user is deliveryman or not
app.get("/users/deliveryman/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res
        .status(403)
        .send({message: "forbidden access" });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let deliveryman=false
  if(user){
    deliveryman=user?.role === "deliveryman" ;
  }
  res.send({deliveryman});
});
// check user is user or not
app.get("/users/normalUser/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res
        .status(403)
        .send({message: "forbidden access" });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let normalUser=false
  if(user){
    normalUser=user?.role === "user" ;
  }
  res.send({normalUser});
});


// get all the delivery man
app.get("/allDeliveryman",async(req,res)=>{
  const user=await usersCollection.find().toArray();
  const deliveryman=user.filter(user=>user.role=="deliveryman")
  res.send(deliveryman)
})


// get all the delivery manId from bookingParcelCollection
app.get("/deliverymanId/:id",async(req,res)=>{
  console.log("hello from deliverymanId",req.query)
  const id=req.params.id;
  console.log("id",id)
  const query = { deliverymanId: id };
  console.log("query",query)
const deliveryman=await BookingParcelCollection.find(query).toArray()
console.log("deliveryman",deliveryman)

  res.send(deliveryman)
})

// to get the id of the loggedIn User
app.get("/getLoggedInId/:email", async (req, res) => {
  const email = req.params.email;
const query = { email: email };
  const user = await usersCollection.findOne(query);
 console.log("user from getloggedIn",user)
  
  res.send(user);
});


// app.get("/deliverymanWithId",async(req,res)=>{
//   const email = req.query.email;
//   const query = { email: email };
//   const user = await usersCollection.findOne(query);
//   console.log("User id deliveryman",user._id)
//   const filter = { deliverymanId: user._id }
//   console.log("query",query)
//   const deliveryman=await BookingParcelCollection.find(filter).toArray()
//   console.log("deliveryman from deliverymanWithId",deliveryman)
  
//     res.send(deliveryman)
//   // res.send(user._id)
// })


// get reviewcount and deliverymancount for all the deliveryman from bookingParcelCollection
// app.get("/countForDeliveryman/:id",async(req,res)=>{
//   const id=req.params.id;
//   // console.log("id",id)
//   const query = { deliverymanId: id };
//   // console.log("query",query)
// const deliveryman=await BookingParcelCollection.find(query).toArray()
// // console.log("deliveryman",deliveryman)

// const deliveredParcel=deliveryman.filter(parcel=>parcel.status=== 'delivered')
// // console.log("deliveredParcel",deliveredParcel)
// const deliveredParcelCount= deliveredParcel.length
// // console.log("deliveredParcelCount",deliveredParcelCount)
// const reviewParcel=deliveryman.filter(parcel=>parcel.review)
// // console.log("reviewParcel",reviewParcel)
// const reviewParcelCount= reviewParcel.length
// // console.log("reviewParcelCount",reviewParcelCount)

// let sumOfReview = 0;
//     for (const parcel of reviewParcel) {
//       sumOfReview += parseInt(parcel.review);
//     }
// // console.log("sumOfReview",sumOfReview)

// const averageReview=(sumOfReview/reviewParcelCount).toFixed(2)
// // console.log(averageReview)
//  res.send({
//   deliveredParcelCount,
//   // reviewParcelCount,
//   // sumOfReview,
//   averageReview
//  })
// })
// update the deliveryman with counts and reviews
// app.patch("/addCountForDeliveryman/:id",async(req,res)=>{
//   const parcel=req.body
//   console.log("parcel",parcel)
//   const id=req.params.id;
//   const filter={_id:new ObjectId(id)}
//   const updateDoc={
//     $set:{
//       deliveredParcelCount:parcel.deliveredParcelCount,
//       averageReview:parcel.averageReview
//     }
//   }
//   console.log(updateDoc)
//   const result=await usersCollection.updateOne(filter,updateDoc)
//   res.send(result)
// })

// get all the parcel booked



app.get("/parcelBooked", async (req, res) => {
  const count = await BookingParcelCollection.countDocuments();
  res.send({ parcelBooked: count });
});
// get all the parcel delivered
app.get("/parcelDelivered", async (req, res) => {
  const count = await BookingParcelCollection.countDocuments({ status: "delivered" });
  res.send({ parcelDelivered: count });
});
// get all the registered user
app.get("/registeredUsers", async (req, res) => {
  const count = await usersCollection.countDocuments();
  res.send({ registeredUsers: count });
});


// update user when he will book a parcel
app.patch('/userParcelCount/:email', async (req, res) => {
  const email = req.params.email;
  const filter = { email: email };
  const updateDoc = {
    $inc: {
      bookParcelCount: 1
    },
  };
  const result = await usersCollection.updateOne(filter, updateDoc)
  res.send(result);
});


// update deliveryman when he will deliver a parcel
app.patch('/deliveredParcelCount/:email', async (req, res) => {
  const email = req.params.email;
  const filter = { email: email };
  const updateDoc = {
    $inc: {
      deliveredParcelCount: 1
    },
  };
  const result = await usersCollection.updateOne(filter, updateDoc)
  res.send(result);
});
app.patch('/reviewedParcelCount/:deliverymanId', async (req, res) => {
  const deliverymanId = req.params.deliverymanId;
  const filter = {_id:new ObjectId (deliverymanId) };
  const reviewedParcel = req.body.reviewedParcel;
  console.log("reviewedParcel",reviewedParcel)
  const updateDoc = {
    $inc: {
      sum : reviewedParcel,
      reviewedParcelCount : 1
    },
  };
  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});


 //update user to admin
 app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: "admin",
    },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});
//update user to deliveryman
app.patch("/users/deliveryman/:id", async (req, res) => {
  const id = req.params.id;
  //console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: "deliveryman",
    },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});

// top deliveryman
app.get('/topDeliveryMen',async(req,res)=>{
  const deliveryMen = await usersCollection
      .find({ 
      role: 'deliveryman', 
      deliveredParcelCount: { $gt: 0 }, 
      reviewedParcelCount: { $gt: 0 } 
    }).toArray();
 deliveryMen.sort((a,b)=>{
      const avgRatingA = a.reviewedParcelCount > 0 ? a.sum / a.reviewedParcelCount : 0;
      const avgRatingB = b.reviewedParcelCount > 0 ? b.sum / b.reviewedParcelCount : 0;
      if (avgRatingA !== avgRatingB) {
        return avgRatingA - avgRatingB;
      }
      return a.deliveredParcelCount - b.deliveredParcelCount;  
    
    })
    res.send(deliveryMen)
    // res.json({ success: true, deliveryMen: deliveryMen });
})
   


// bookParcel related api
app.get("/bookParcel",async(req,res)=>{
  const result=await BookingParcelCollection.find().toArray();
  res.send(result)
})
// get bookparcel by email
app.get('/bookParcelByEmail', async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await BookingParcelCollection.find(query).toArray();
  res.send(result);
});

app.get("/parcelBooked/:email", async (req, res) => {
  const email=req.params.email;
  // console.log(email)
  const query={email:email}
  const count = await BookingParcelCollection.countDocuments(query);
  console.log(count)
  res.send({ parcelBooked: count });
});

app.get("/bookParcelForOneItem/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await BookingParcelCollection.findOne(query)
  res.send(result)
})
app.patch("/bookParcelForOneItem/:id",async(req,res)=>{
  const parcel=req.body
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
name:parcel.name,
email:parcel.email,
phone:parcel.phone,
type:parcel.type,
weight:parcel.weight,
receiver_name:parcel.receiver_name,
receiver_phone:parcel.receiver_phone,
requested_delivery_address:parcel.requested_delivery_address,
latitude:parcel.latitude,
longtitude:parcel.longtitude,
delivery_date:parcel.delivery_date,
price:parcel.price,
status:parcel.status,
    }
  }
  const result=await BookingParcelCollection.updateOne(filter,updateDoc)
  res.send(result)
})

// update deliverymanId,approx_date and status
app.patch("/bookParcelFromAdmin/:id",async(req,res)=>{
  const parcel=req.body
  console.log("percel",parcel)
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
      deliverymanId:parcel.deliverymanId,
      approximate_delivery_date:parcel.approximate_delivery_date,
      status:parcel.status,
    }
  }
  console.log(updateDoc)
  const result=await BookingParcelCollection.updateOne(filter,updateDoc)
  res.send(result)
})
// update only status
app.patch("/bookParcelFromDeliveryman/:id",async(req,res)=>{
  const parcel=req.body
  console.log("percel",parcel)
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
      status:parcel.status,
    }
  }
  console.log(updateDoc)
  const result=await BookingParcelCollection.updateOne(filter,updateDoc)
  res.send(result)
})

// update review,review_giving_date and feedback_Text
app.patch("/updateBookParcelFromUser/:id",async(req,res)=>{
  const parcel=req.body
  // console.log("percel",parcel)
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
      feedback_Text:parcel.feedback_Text,
      review:parcel.review,
      Review_Giving_Date:parcel.Review_Giving_Date,
    }
  }
  console.log(updateDoc)
  const result=await BookingParcelCollection.updateOne(filter,updateDoc)
  res.send(result)
})





app.post("/bookParcel",async(req,res)=>{
  const parcel=req.body;
  // console.log(parcel)
  const result=await BookingParcelCollection.insertOne(parcel)
  res.send(result)
})

app.delete("/bookParcelDelete/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)};
  const booking= await BookingParcelCollection.findOne(query)
  if(!booking){
    return res.status(404).json({ error: "Booking not found" });
  }
  if(booking.status !== 'pending'){
     return res.status(403).json({ error: "Cannot delete a booking with a status other than 'pending'" });
  }
  const result=await BookingParcelCollection.deleteOne(query)
  res.send(result)
})

// // get all the Customer
// app.get("/allNormalUser",async(req,res)=>{
//   const user=await usersCollection.find().toArray();
//   const normalUser=user.filter(user=>user.role=="user")
//   res.send(normalUser)
// })


// pagination
app.get('/itemsCount', async (req, res) => {
  const count = await usersCollection.countDocuments({ role: 'user' });
  res.send({ count });
})

app.get('/items', async (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);

  // console.log('pagination query', page, size);
  const result = await usersCollection.find({ role: 'user' })
  .skip(page * size)
  .limit(size)
  .toArray();
  // console.log(result)
  res.send(result);
})

// payment related api

app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
const amount=parseInt(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.post("/payments",async(req,res)=>{
  const payment=req.body;
  const result=await PaymentCollection.insertOne(payment);
  // const query={_id:new ObjectId(payment.bookingId)}
  // console.log("payment.bookingId",payment.bookingId)
  // console.log("payment info",payment)
  // const deleteParcel=await BookingParcelCollection.deleteOne(query)

  // res.send({result,deleteParcel})
  res.send({result})
})


app.get('/paymentHistory', async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await PaymentCollection.find(query).toArray();
  res.send(result);
});

    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/",async(req,res)=>{
    res.send("SwiftShip delivery is coming to your home")
})

app.listen(port,()=>{
    console.log(`SwiftShip delivery is running on ${port}`)
})