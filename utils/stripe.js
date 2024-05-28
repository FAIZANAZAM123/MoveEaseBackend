const express = require("express");
const router = express.Router();
const stripe = require('stripe');
const { connection } = require("../utils/database");

const stripeInstance = stripe('sk_test_51NGLdEKwJLyQyijSFKLNSCFTYAOqugWWkXwpdonfhK7IzoiPusWGyfUMaMgxzxl0aVmrxpg09TzP3rFD2skR3tBm00ERLSzg0p');

router.post('/', (req, res) => {
  console.log(req.query);

  const size = parseInt(req.query.livingspace, 10);
  const distance = parseInt(req.query.distance, 10);
  const fromlocation = req.query.fromlocation;
  const afterlocation = req.query.afterlocation;
  const date = req.query.date;

  console.log("size", size, "distance", distance);
  let price = 0;

  if (size <= 35) {
    if (distance <= 30) {
      price = 350 + 7 * size;
    } else if (distance <= 300) {
      price = 500 + 5 * size;
    } else {
      price = 750 + 15 * size;
    }
  } else if (size <= 60) {
    if (distance <= 30) {
      price = 700 + 5 * size;
    } else if (distance <= 300) {
      price = 900 + 10 * size;
    } else {
      price = 1000 + 20 * size;
    }
  } else if (size <= 85) {
    if (distance <= 30) {
      price = 850 + 6 * size;
    } else if (distance <= 300) {
      price = 1000 + 12 * size;
    } else {
      price = 1250 + 15 * size;
    }
  } else if (size > 120) {
    if (distance <= 30) {
      price = 1200 + 5 * size;
    } else if (distance <= 300) {
      price = 1500 + 10 * size;
    } else {
      price = 2250 + 25 * size;
    }
  } else {
    price = 0;
  }

  console.log(price);

  async function checkout() {
    try {
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: afterlocation,
                images: ['https://thumbor.forbes.com/thumbor/fit-in/900x510/https://www.forbes.com/home-improvement/wp-content/uploads/2022/07/Paris_Moving_1-scaled-e1710759249141.jpg'],
              },
              unit_amount: price * 100, 
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `http://localhost:3001/MoveRequest?session_id={CHECKOUT_SESSION_ID}&data=${encodeURIComponent(JSON.stringify(req.body))}`,
        cancel_url: 'http://localhost:3001',
      });

      // Ensure transactions table exists
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fromlocation VARCHAR(255),
          tolocation VARCHAR(255),
          size VARCHAR(255),

          date DATE,
          price DECIMAL(10, 2)
        )
      `;

      connection.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          return res.status(500).send('Internal Server Error');
        }

        // Insert transaction record
        const insertQuery = `
          INSERT INTO transactions (fromlocation, tolocation, date,size,price)
          VALUES (?, ?, ?,?, ?)
        `;

        connection.query(insertQuery, [fromlocation, afterlocation, date,size, price], (err, result) => {
          if (err) {
            console.error('Error inserting transaction:', err);
            return res.status(500).send('Internal Server Error');
          }

          res.send(session.url);
        });
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  checkout();
});

router.post('/sub', (req, response) => {
  console.log(req.body);
  async function checkout() {
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'pkr',
            product_data: {
              name: req.body.title,
              images: [req.body.img],
            },
            unit_amount: req.body.price * 100000,
          },
          quantity: req.body.quantity,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:8800/api/serviceProviderSubscription/add?session_id={CHECKOUT_SESSION_ID}&data=${encodeURIComponent(JSON.stringify(req.body))}`,
      cancel_url: 'http://localhost:3001',
    });
    console.log(session.url)
    return session.url;
  }

  checkout().then((url) => response.send(url))
    .catch((error) => console.log(error));
})

module.exports = router;