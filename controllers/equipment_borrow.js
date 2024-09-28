const express = require('express')
const database = require('../models/connection_db')
const user_model = require('../models/user_mod')
const equipment_model = require('../models/equipment_mod')

const submitForm = async (req, res, next) => {
  let { firstName, lastName, departmentName, email, natureOfService, purpose, equipmentCategories } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !departmentName || !email || !natureOfService || !purpose || !equipmentCategories || equipmentCategories.length === 0) {
    return res.status(400).json({
      successful: false,
      message: "Missing required fields: First name, Last name, Department name, Email, Nature of service, Purpose, or Equipment categories."
    });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      successful: false,
      message: "Invalid email format."
    });
  }

  // Validate dates
  for (let item of equipmentCategories) {
    if (!item.category || !item.dateRequested || !/^\d{4}-\d{2}-\d{2}$/.test(item.dateRequested)) {
      return res.status(400).json({
        successful: false,
        message: "Each equipment category must include a valid date in YYYY-MM-DD format."
      });
    }
  }

  try {
    // Check if email already exists
    const selectUserQuery = `SELECT user_id FROM users WHERE email = ?`;
    database.db.query(selectUserQuery, [email], (err, rows) => {
      if (err) {
        return res.status(500).json({
          successful: false,
          message: "Database error occurred.",
          error: err
        });
      }

      if (rows.length > 0) {
        return res.status(400).json({
          successful: false,
          message: "Email is already registered."
        });
      } else {
        // Insert user into users table
        const insertUserQuery = `INSERT INTO users (first_name, last_name, department_name, email) VALUES (?, ?, ?, ?)`;
        const userValues = [firstName, lastName, departmentName, email];

        database.db.query(insertUserQuery, userValues, (err, result) => {
          if (err) {
            return res.status(500).json({
              successful: false,
              message: "Failed to insert user into the database.",
              error: err
            });
          }

          const userId = result.insertId;

          // Insert into equipment_requests table
          const insertRequestQuery = `INSERT INTO equipment_requests (user_id, nature_of_service, purpose, status) VALUES (?, ?, ?, 'Pending')`;
          database.db.query(insertRequestQuery, [userId, natureOfService, purpose], (err, result) => {
            if (err) {
              return res.status(500).json({
                successful: false,
                message: "Failed to insert equipment request into the database.",
                error: err
              });
            }

            const requestId = result.insertId;

            // Insert selected equipment into request_items table
            const insertRequestItemsQuery = `INSERT INTO request_items (request_id, equipment_id, requested_date) VALUES (?, ?, ?)`;

            let insertItemPromises = equipmentCategories.map(item => {
              return new Promise((resolve, reject) => {
                // Select random equipment from equipment table for the requested category
                const selectEquipmentQuery = `SELECT equipment_id FROM equipment WHERE category = ? AND count > 0 ORDER BY RAND() LIMIT 1`;

                database.db.query(selectEquipmentQuery, [item.category], (err, rows) => {
                  if (err) {
                    return reject(`Error selecting equipment for category: ${item.category}, error: ${err.message}`);
                  }
                  
                  if (rows.length === 0) {
                    return reject(`No equipment available for the requested category: ${item.category}`);
                  }

                  const equipmentId = rows[0].equipment_id;

                  // Insert the equipment into request_items
                  database.db.query(insertRequestItemsQuery, [requestId, equipmentId, item.dateRequested], (err, result) => {
                    if (err) {
                      return reject(`Failed to insert request item for category: ${item.category}, error: ${err.message}`);
                    }
                    resolve();
                  });
                });
              });
            });

            // Wait for all request items to be inserted
            Promise.all(insertItemPromises)
              .then(() => {
                // Insert request status into request_history
                const insertHistoryQuery = `INSERT INTO request_history (request_id, status) VALUES (?, 'Pending')`;
                database.db.query(insertHistoryQuery, [requestId], (err, result) => {
                  if (err) {
                    return res.status(500).json({
                      successful: false,
                      message: "Failed to insert request history.",
                      error: err
                    });
                  }

                  res.status(200).json({
                    successful: true,
                    message: "Request successfully submitted and recorded."
                  });
                });
              })
              .catch(error => {
                res.status(500).json({
                  successful: false,
                  message: error
                });
              });
          });
        });
      }
    });
  } catch (err) {
    res.status(500).json({
      successful: false,
      message: "An unexpected error occurred.",
      error: err
    });
  }
};




/*
const submitForm = async (req, res, next) => {
  let firstName = req.body.firstName
  let lastName = req.body.lastName
  let email = req.body.email
  let natureofService = req.body.natureofService
  let purpose = req.body.purpose


  if (!firstName || !lastName || !email || !natureofService || !purpose) {
    return res.status(404).json({
      successful: false,
      message: "First name, last name, email, nature of service, or purpose is missing."
    })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {  // Basic email validation
    res.status(400).json({
      successful: false,
      message: "Invalid email format."
    })
  } else {
    try {
      // Set the role to 'requisitioner' and password_hash to 'N/A'
      let role = "requisitioner"
      let password_hash = "N/A"

      // Check if the email already exists
      let selectQuery = `SELECT email FROM users WHERE email = ?`
      database.db.query(selectQuery, [email], async (err, rows) => {
        if (err) {
          res.status(500).json({
            successful: false,
            message: "Database error occurred.",
            error: err
          })
        } else {
          if (rows.length > 0) {
            res.status(400).json({
              successful: false,
              message: "Email is already registered."
            })
          } else {
            // Insert the user data into the users table
            let insertUserQuery = `INSERT INTO users SET ?`
            let userOBJ = {
              first_name: firstName,
              last_name: lastName,
              email: email,
              role: role,  // Adding the role field
              password_hash: password_hash  // Adding the password_hash field
            }

            // Insert the user and get the user_id
            database.db.query(insertUserQuery, userOBJ, (err, result) => {
              if (err) {
                res.status(500).json({
                  successful: false,
                  message: "Failed to insert user into the database.",
                  error: err
                })
              } else {
                // Get the inserted user's ID
                let userId = result.insertId

                // Now insert into the equipment_requests table
                let insertRequestQuery = `INSERT INTO equipment_requests (user_id, nature_of_service, purpose) VALUES (?, ?, ?)`
                database.db.query(insertRequestQuery, [userId, natureofService, purpose], (err, result) => {
                  if (err) {
                    res.status(500).json({
                      successful: false,
                      message: "Failed to insert equipment request into the database.",
                      error: err
                    })
                  } else {
                    res.status(200).json({
                      successful: true,
                      message: "User successfully registered and equipment request created."
                    })
                  }
                })
              }
            })
          }
        }
      })
    } catch (err) {
      res.status(500).json({
        successful: false,
        message: "An unexpected error occurred.",
        error: err
      })
    }
  }
}
*/

const getAllEquipment = async (req, res, next) => {
  try {
    // Query to retrieve all equipment details from the equipment table
    const query = `SELECT * FROM equipment`;

    database.db.query(query, (err, rows) => {
      if (err) {
        return res.status(500).json({
          successful: false,
          message: "Database error occurred while retrieving equipment.",
          error: err
        });
      } else {
        if (rows.length === 0) {
          return res.status(404).json({
            successful: false,
            message: "No equipment found."
          });
        } else {
          return res.status(200).json({
            successful: true,
            message: "Equipment details retrieved successfully.",
            equipment: rows
          });
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: "An unexpected error occurred.",
      error: err
    });
  }
};


module.exports = {
  submitForm,
  getAllEquipment
}
