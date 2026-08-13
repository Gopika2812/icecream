const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Asset = require('./models/Asset');
const AssetMaintenance = require('./models/AssetMaintenance');
const Vehicle = require('./models/Vehicle');
const VehicleMaintenance = require('./models/VehicleMaintenance');
const Customer = require('./models/Customer');

async function seedAssetsAndVehicles() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/icecream-erp';
    console.log('Connecting to MongoDB...', mongoUri);
    await mongoose.connect(mongoUri);

    // Fetch a sample customer to assign dealer freezer
    const sampleCustomer = await Customer.findOne({});

    console.log('Seeding Sample Assets...');
    await Asset.deleteMany({});
    await AssetMaintenance.deleteMany({});

    const assetsData = [
      {
        assetCode: 'A001',
        name: 'Continuous Freezer 600 LPH',
        category: 'Processing Machinery',
        modelNumber: 'CF-600-PRO',
        serialNumber: 'SN-FREEZER-8821',
        manufacturer: 'Tetra Pak Processing',
        purchaseDate: new Date('2024-01-15'),
        purchaseCost: 850000,
        warrantyExpiry: new Date('2026-01-15'),
        location: 'Factory Floor 1 - Freezing Line',
        status: 'Operational',
        totalMaintenanceCost: 18500
      },
      {
        assetCode: 'A002',
        name: 'HTST Mix Pasteurizer 1000 LPH',
        category: 'Processing Machinery',
        modelNumber: 'PST-1000-HTST',
        serialNumber: 'SN-PAST-9912',
        manufacturer: 'Alfa Laval Ltd',
        purchaseDate: new Date('2023-08-10'),
        purchaseCost: 1200000,
        warrantyExpiry: new Date('2025-08-10'),
        location: 'Factory Floor 1 - Pasteurized Section',
        status: 'Operational',
        totalMaintenanceCost: 24000
      },
      {
        assetCode: 'A003',
        name: 'Blast Hardening Tunnel Unit (-35°C)',
        category: 'Cold Storage & Compressors',
        modelNumber: 'BHT-35-MAX',
        serialNumber: 'SN-HARDEN-7734',
        manufacturer: 'Blue Star Industrial',
        purchaseDate: new Date('2024-03-20'),
        purchaseCost: 1500000,
        warrantyExpiry: new Date('2027-03-20'),
        location: 'Factory Cold Room Wing A',
        status: 'Operational',
        totalMaintenanceCost: 12500
      },
      {
        assetCode: 'A004',
        name: 'Glass-Top Retail Deep Freezer 300L',
        category: 'Retail Dealer Freezer',
        modelNumber: 'GT-300-ICE',
        serialNumber: 'SN-FRZ-300L-4411',
        manufacturer: 'Voltas Commercial Freezers',
        purchaseDate: new Date('2024-05-12'),
        purchaseCost: 38000,
        warrantyExpiry: new Date('2027-05-12'),
        location: sampleCustomer?.shopName || 'Retail Dealer Shop',
        status: 'Assigned to Dealer',
        assignedDealerCustomer: sampleCustomer?._id,
        dealerAssignedDate: new Date('2024-06-01'),
        totalMaintenanceCost: 3500
      },
      {
        assetCode: 'A005',
        name: 'Cummins 125 KVA Silent Diesel Generator',
        category: 'Utility & Generator',
        modelNumber: 'C125D5P',
        serialNumber: 'SN-GEN-125KVA',
        manufacturer: 'Cummins India',
        purchaseDate: new Date('2023-05-01'),
        purchaseCost: 620000,
        warrantyExpiry: new Date('2026-05-01'),
        location: 'Factory Generator Shed',
        status: 'Operational',
        totalMaintenanceCost: 16000
      }
    ];

    const createdAssets = await Asset.insertMany(assetsData);
    console.log(`Created ${createdAssets.length} Assets (A001 - A005).`);

    // Add sample maintenance logs
    await AssetMaintenance.create([
      {
        maintenanceNumber: 'MNT-AST-0001',
        asset: createdAssets[0]._id,
        serviceType: 'Preventive Servicing',
        issueDescription: 'Scheduled 6-Month Compressor Oil & Seal Gasket Replacement',
        workDone: 'Replaced Synthetic Compressor Oil 10L & High-Pressure Shaft Seal',
        serviceVendor: 'Tetra Pak India Service Team',
        sparePartsCost: 14500,
        laborCost: 4000,
        totalExpenseAmount: 18500,
        servicedDate: new Date('2026-01-20'),
        status: 'Completed'
      },
      {
        maintenanceNumber: 'MNT-AST-0002',
        asset: createdAssets[1]._id,
        serviceType: 'Calibration',
        issueDescription: 'Pasteurizer Temperature Probe Calibration & Plate Descaling',
        workDone: 'Cleaned Stainless Steel Heat Exchanger Plates & Calibrated PT100 Sensor',
        serviceVendor: 'Alfa Laval Certified Engineer',
        sparePartsCost: 18000,
        laborCost: 6000,
        totalExpenseAmount: 24000,
        servicedDate: new Date('2026-02-05'),
        status: 'Completed'
      }
    ]);

    console.log('Seeding Sample Vehicles (Auto Sales Vans & Reefer Trucks)...');
    await Vehicle.deleteMany({});
    await VehicleMaintenance.deleteMany({});

    const vehiclesData = [
      {
        vehicleCode: 'VECH001',
        registrationNumber: 'TN-38-AX-1234',
        vehicleType: 'Auto Sales Delivery Van',
        makeModel: 'Piaggio Ape Auto Commercial',
        reeferUnitMake: 'Eutectic Insulated Box',
        targetTemperature: -18,
        payloadCapacityBoxes: 45,
        assignedDriver: 'Murugan K.',
        driverContact: '9842109876',
        status: 'Operational',
        insuranceExpiry: new Date('2026-11-15'),
        fitnessCertExpiry: new Date('2027-02-10'),
        pucExpiry: new Date('2026-09-30'),
        currentOdometerKm: 14250,
        totalMaintenanceCost: 6800
      },
      {
        vehicleCode: 'VECH002',
        registrationNumber: 'TN-58-BY-5678',
        vehicleType: 'Delivery Auto',
        makeModel: 'Mahindra Treo Zor Electric Auto',
        reeferUnitMake: 'Insulated Battery Cold Box',
        targetTemperature: -15,
        payloadCapacityBoxes: 35,
        assignedDriver: 'Saravanan P.',
        driverContact: '9789012345',
        status: 'Operational',
        insuranceExpiry: new Date('2026-10-20'),
        fitnessCertExpiry: new Date('2026-12-15'),
        pucExpiry: new Date('2026-08-30'),
        currentOdometerKm: 8400,
        totalMaintenanceCost: 3200
      },
      {
        vehicleCode: 'VECH003',
        registrationNumber: 'TN-39-CZ-9012',
        vehicleType: 'Auto Sales Delivery Van',
        makeModel: 'Tata Ace Gold BS6',
        reeferUnitMake: 'Thermo King V-200 Reefer',
        targetTemperature: -20,
        payloadCapacityBoxes: 80,
        assignedDriver: 'Rajan M.',
        driverContact: '9655432109',
        status: 'Operational',
        insuranceExpiry: new Date('2026-08-25'), // Warning due soon!
        fitnessCertExpiry: new Date('2027-04-12'),
        pucExpiry: new Date('2026-11-01'),
        currentOdometerKm: 26100,
        totalMaintenanceCost: 14500
      },
      {
        vehicleCode: 'VECH004',
        registrationNumber: 'TN-37-EZ-4321',
        vehicleType: 'Reefer Truck',
        makeModel: 'Eicher Pro 2059 Heavy Reefer 14ft',
        reeferUnitMake: 'Carrier Supra 750 Refrigeration Unit',
        targetTemperature: -22,
        payloadCapacityBoxes: 250,
        assignedDriver: 'Selvam R.',
        driverContact: '9443210987',
        status: 'Operational',
        insuranceExpiry: new Date('2027-01-30'),
        fitnessCertExpiry: new Date('2027-06-18'),
        pucExpiry: new Date('2026-10-15'),
        currentOdometerKm: 42000,
        totalMaintenanceCost: 28400
      }
    ];

    const createdVehicles = await Vehicle.insertMany(vehiclesData);
    console.log(`Created ${createdVehicles.length} Fleet Vehicles (VECH001 - VECH004).`);

    // Add sample vehicle maintenance logs
    await VehicleMaintenance.create([
      {
        maintenanceNumber: 'MNT-VEC-0001',
        vehicle: createdVehicles[0]._id,
        serviceType: 'Engine Oil & Filter',
        description: 'Periodic 10,000 Km Service: Engine Oil, Oil Filter & Spark Plug Change',
        workshopName: 'Sri Amman Auto Works',
        odometerKm: 10000,
        partsCost: 3800,
        laborCost: 1200,
        totalExpenseAmount: 5000,
        servicedDate: new Date('2026-01-10'),
        nextServiceDueKm: 15000
      },
      {
        maintenanceNumber: 'MNT-VEC-0002',
        asset: createdVehicles[0]._id,
        vehicle: createdVehicles[0]._id,
        serviceType: 'Tire Replacement',
        description: 'Replaced 2 Rear Tyres due to wear & wheel alignment',
        workshopName: 'MRF Tyres Service Center',
        odometerKm: 14000,
        partsCost: 1500,
        laborCost: 300,
        totalExpenseAmount: 1800,
        servicedDate: new Date('2026-02-18'),
        nextServiceDueKm: 25000
      },
      {
        maintenanceNumber: 'MNT-VEC-0003',
        vehicle: createdVehicles[2]._id,
        serviceType: 'Reefer AC Gas & Compressor',
        description: 'Thermo King Reefer Gas R404a Top-up & Expansion Valve Cleaning',
        workshopName: 'Thermo King Authorized Service Workshop',
        odometerKm: 25000,
        partsCost: 10500,
        laborCost: 4000,
        totalExpenseAmount: 14500,
        servicedDate: new Date('2026-02-01'),
        nextServiceDueKm: 35000
      }
    ]);

    console.log('Sample Assets & Vehicles seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding assets & vehicles:', err);
    process.exit(1);
  }
}

seedAssetsAndVehicles();
