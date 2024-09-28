const express = require('express')
const equipmentController = require('../controllers/equipment_borrow')

const prodRouter = express.Router()

prodRouter.post('/insert-details', equipmentController.submitForm)
// Route to get all equipment
prodRouter.get('/get-all-equipment', equipmentController.getAllEquipment);


module.exports =
    prodRouter;