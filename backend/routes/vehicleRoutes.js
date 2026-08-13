const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(vehicleController.getVehicles)
    .post(vehicleController.createVehicle);

router.route('/:id')
    .put(vehicleController.updateVehicle)
    .delete(vehicleController.deleteVehicle);

router.route('/:id/maintenance')
    .get(vehicleController.getVehicleMaintenanceHistory)
    .post(vehicleController.addVehicleMaintenance);

module.exports = router;
