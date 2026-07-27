require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Vendor = require('./models/Vendor');
const Customer = require('./models/Customer');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for Seeding Test Data');

        // 1. Seed Products
        console.log('Seeding products...');
        await Product.deleteMany({});
        
        const productsList = [
            // --- Raw Materials: Dairy & Ingredients ---
            {
                itemCode: 'RM-MILK-001',
                name: 'Fresh Cow Milk',
                itemType: 'Raw Material',
                category: 'Dairy',
                unitOfMeasure: 'Ltr',
                mrp: 60,
                wholesalePrice: 50,
                minimumStockLevel: 500,
                status: 'Active'
            },
            {
                itemCode: 'RM-CREAM-001',
                name: 'Fresh Dairy Cream 35%',
                itemType: 'Raw Material',
                category: 'Dairy',
                unitOfMeasure: 'Kg',
                mrp: 350,
                wholesalePrice: 280,
                minimumStockLevel: 100,
                status: 'Active'
            },
            {
                itemCode: 'RM-SUGAR-001',
                name: 'Refined White Sugar',
                itemType: 'Raw Material',
                category: 'Ingredients',
                unitOfMeasure: 'Kg',
                mrp: 45,
                wholesalePrice: 38,
                minimumStockLevel: 200,
                status: 'Active'
            },
            {
                itemCode: 'RM-GLUC-001',
                name: 'Liquid Glucose Syrup',
                itemType: 'Raw Material',
                category: 'Ingredients',
                unitOfMeasure: 'Kg',
                mrp: 90,
                wholesalePrice: 75,
                minimumStockLevel: 50,
                status: 'Active'
            },
            {
                itemCode: 'RM-VANILLA-001',
                name: 'Natural Vanilla Extract',
                itemType: 'Raw Material',
                category: 'Flavors',
                unitOfMeasure: 'Ltr',
                mrp: 1200,
                wholesalePrice: 1000,
                minimumStockLevel: 10,
                status: 'Active'
            },
            {
                itemCode: 'RM-COCOA-001',
                name: 'Premium Cocoa Powder',
                itemType: 'Raw Material',
                category: 'Flavors',
                unitOfMeasure: 'Kg',
                mrp: 500,
                wholesalePrice: 420,
                minimumStockLevel: 25,
                status: 'Active'
            },
            {
                itemCode: 'RM-MANGO-001',
                name: 'Alphonso Mango Pulp',
                itemType: 'Raw Material',
                category: 'Fruits',
                unitOfMeasure: 'Kg',
                mrp: 200,
                wholesalePrice: 160,
                minimumStockLevel: 50,
                status: 'Active'
            },
            {
                itemCode: 'RM-STAB-001',
                name: 'Stabilizer & Emulsifier Blend',
                itemType: 'Raw Material',
                category: 'Chemical',
                unitOfMeasure: 'Kg',
                mrp: 600,
                wholesalePrice: 520,
                minimumStockLevel: 15,
                status: 'Active'
            },

            // --- Raw Materials: Packaging ---
            {
                itemCode: 'PKG-CUP-100',
                name: 'Paper Ice Cream Cup 100ml',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 2.5,
                wholesalePrice: 1.8,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-LID-100',
                name: 'Plastic Cup Lid 100ml',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 1.0,
                wholesalePrice: 0.6,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-CUP-250',
                name: 'Paper Ice Cream Cup 250ml',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 4.5,
                wholesalePrice: 3.2,
                minimumStockLevel: 500,
                status: 'Active'
            },
            {
                itemCode: 'PKG-LID-250',
                name: 'Plastic Cup Lid 250ml',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 1.5,
                wholesalePrice: 0.9,
                minimumStockLevel: 500,
                status: 'Active'
            },
            {
                itemCode: 'PKG-STICK-01',
                name: 'Wooden Ice Cream Stick',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 0.5,
                wholesalePrice: 0.25,
                minimumStockLevel: 2000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-SPOON-01',
                name: 'Mini Plastic Spoon',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 0.6,
                wholesalePrice: 0.3,
                minimumStockLevel: 2000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-CONE-01',
                name: 'Wafer Cone Medium',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 3.5,
                wholesalePrice: 2.2,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-CONE-SLV',
                name: 'Printed Cone Sleeve',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 0.8,
                wholesalePrice: 0.4,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-BOX-24',
                name: 'Corrugated Outer Box (x24 capacity)',
                itemType: 'Raw Material',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                mrp: 25,
                wholesalePrice: 18,
                minimumStockLevel: 200,
                status: 'Active'
            },

            // --- Finished Goods ---
            {
                itemCode: 'FG-VANILLA-100',
                name: 'Vanilla Classic Cup 100ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                mrp: 20,
                wholesalePrice: 15,
                minimumStockLevel: 200,
                status: 'Active'
            },
            {
                itemCode: 'FG-CHOCO-100',
                name: 'Double Chocolate Cup 100ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                mrp: 25,
                wholesalePrice: 18,
                minimumStockLevel: 200,
                status: 'Active'
            },
            {
                itemCode: 'FG-MANGO-250',
                name: 'Alphonso Mango Cup 250ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                mrp: 50,
                wholesalePrice: 38,
                minimumStockLevel: 100,
                status: 'Active'
            },
            {
                itemCode: 'FG-CHOCBAR-70',
                name: 'Choco-Bar Stick Ice Cream 70ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                mrp: 30,
                wholesalePrice: 22,
                minimumStockLevel: 300,
                status: 'Active'
            },
            {
                itemCode: 'FG-CONE-VANILLA',
                name: 'Premium Vanilla Wafer Cone',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                mrp: 40,
                wholesalePrice: 30,
                minimumStockLevel: 150,
                status: 'Active'
            }
        ];

        await Product.insertMany(productsList);
        console.log(`Successfully seeded ${productsList.length} products.`);

        // 2. Seed Vendors
        console.log('Seeding vendors...');
        await Vendor.deleteMany({});
        const vendorsList = [
            {
                vendorCode: 'V-DAIRY-001',
                name: 'Krishna Dairy Farm & Co',
                contactPerson: 'Karan Singh',
                phone: '9876543210',
                email: 'orders@krishnadairy.com',
                gstinNumber: '33AAAAA1111A1Z1',
                address: {
                    street: '12, Dairy Colony Bypass Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641001'
                },
                status: 'Active'
            },
            {
                vendorCode: 'V-SUGAR-002',
                name: 'Sri Ganapathy Sugar Mill Distributors',
                contactPerson: 'S. Murugan',
                phone: '9443212345',
                email: 'sales@ganapathysugar.com',
                gstinNumber: '33BBBBB2222B1Z2',
                address: {
                    street: '45, Sugar Mill Road',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625001'
                },
                status: 'Active'
            },
            {
                vendorCode: 'V-PACK-003',
                name: 'Apex Packaging Industries',
                contactPerson: 'Ramesh Patel',
                phone: '9894012345',
                email: 'apexpack@gmail.com',
                gstinNumber: '33CCCCC3333C1Z3',
                address: {
                    street: 'Plot No. 18, SIDCO Industrial Estate',
                    city: 'Chennai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '600098'
                },
                status: 'Active'
            }
        ];
        await Vendor.insertMany(vendorsList);
        console.log(`Successfully seeded ${vendorsList.length} vendors.`);

        // 3. Seed Customers
        console.log('Seeding customers...');
        await Customer.deleteMany({});
        const customersList = [
            {
                customerCode: 'C-DEALER-001',
                name: 'Nila Cold Storage & Ice Cream Parlour',
                customerType: 'Dealer',
                contactPerson: 'Senthil Kumar',
                email: 'nilacoldstorage@gmail.com',
                phone: '9843055667',
                billingAddress: {
                    street: '102, Main Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641002'
                },
                gstinNumber: '33DDDDD4444D1Z4',
                status: 'Active'
            },
            {
                customerCode: 'C-PARTY-002',
                name: 'Grand Caterers & Event Managers',
                customerType: 'Party order',
                contactPerson: 'Vijay Anand',
                email: 'vijay@grandcaterers.com',
                phone: '9003344556',
                billingAddress: {
                    street: '77, Gandhi Road',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625003'
                },
                gstinNumber: '33EEEEE5555E1Z5',
                status: 'Active'
            }
        ];
        await Customer.insertMany(customersList);
        console.log(`Successfully seeded ${customersList.length} customers.`);

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding test data:', error);
        process.exit(1);
    }
};

seedData();
