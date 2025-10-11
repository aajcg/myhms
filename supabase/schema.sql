-- Patients table
CREATE TABLE patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    emergency_contact VARCHAR(100),
    blood_type VARCHAR(5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Doctors table
CREATE TABLE doctors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    specialization VARCHAR(100),
    department VARCHAR(100),
    license_number VARCHAR(50),
    experience_years INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    consultation_fee DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    head_doctor_id UUID REFERENCES doctors(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    doctor_id UUID REFERENCES doctors(id) NOT NULL,
    appointment_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    appointment_id UUID REFERENCES appointments(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'completed'
);

-- Inventory table
CREATE TABLE inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    supplier VARCHAR(200),
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Doctor schedules table
CREATE TABLE doctor_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID REFERENCES doctors(id) NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled'
);