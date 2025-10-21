import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.jsx';
import { useAuth } from '../lib/auth.jsx';

const Payments = () => {
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: '',
    total_amount: '',
    due_date: ''
  });
  const [paymentData, setPaymentData] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'cash'
  });

  const { userType, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [userType, user]);

  const fetchData = async () => {
    try {
      let invoicesQuery = supabase.from('invoices').select(`
        *,
        patients (first_name, last_name),
        appointments (appointment_date)
      `).order('created_at', { ascending: false });

      let transactionsQuery = supabase.from('transactions').select(`
        *,
        invoices (invoice_number, patients (first_name, last_name))
      `).order('transaction_date', { ascending: false });

      // Filter for patients - only show their own invoices
      if (userType === 'patient') {
        invoicesQuery = invoicesQuery.eq('patient_id', user.id);
        transactionsQuery = transactionsQuery.eq('invoices.patient_id', user.id);
      }

      const [invoicesRes, transactionsRes, patientsRes, appointmentsRes] = await Promise.all([
        invoicesQuery,
        transactionsQuery,
        userType === 'admin' ? supabase.from('patients').select('id, first_name, last_name').order('first_name') : { data: [] },
        userType === 'admin' ? supabase.from('appointments').select(`
          id,
          appointment_date,
          patients (first_name, last_name),
          doctors (first_name, last_name)
        `).order('appointment_date', { ascending: false }) : { data: [] }
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setInvoices(invoicesRes.data || []);
      setTransactions(transactionsRes.data || []);
      setPatients(patientsRes.data || []);
      setAppointments(appointmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('invoices')
        .insert([{
          ...formData,
          invoice_number: invoiceNumber,
          total_amount: parseFloat(formData.total_amount),
          due_date: formData.due_date || null
        }]);

      if (error) throw error;
      
      setShowInvoiceModal(false);
      setFormData({
        patient_id: '',
        appointment_id: '',
        total_amount: '',
        due_date: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice: ' + error.message);
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          ...paymentData,
          amount: parseFloat(paymentData.amount),
          status: 'completed'
        }]);

      if (error) throw error;

      // Update invoice paid amount
      const invoice = invoices.find(inv => inv.id === paymentData.invoice_id);
      const newPaidAmount = (invoice.paid_amount || 0) + parseFloat(paymentData.amount);
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partial';

      await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus
        })
        .eq('id', paymentData.invoice_id);

      setShowPaymentModal(false);
      setPaymentData({
        invoice_id: '',
        amount: '',
        payment_method: 'cash'
      });
      setSelectedInvoice(null);
      fetchData();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      invoice_id: invoice.id,
      amount: (invoice.total_amount - (invoice.paid_amount || 0)).toString(),
      payment_method: 'cash'
    });
    setShowPaymentModal(true);
  };

  const statusColors = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800'
  };

  const paymentMethodColors = {
    cash: 'bg-gray-100 text-gray-800',
    card: 'bg-blue-100 text-blue-800',
    insurance: 'bg-green-100 text-green-800',
    online: 'bg-purple-100 text-purple-800'
  };

  const getPageTitle = () => {
    switch (userType) {
      case 'patient': return 'My Billing';
      default: return 'Payments';
    }
  };

  const canCreateInvoice = userType === 'admin';
  const canProcessPayments = userType === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        {canCreateInvoice && (
          <div className="space-x-3">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Invoice
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {userType === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">
              ${invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">
              ${invoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Pending Payments</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
            <div className="text-sm text-gray-600">Total Invoices</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
            <div className="text-sm text-gray-600">Transactions</div>
          </div>
        </div>
      )}

      {/* Patient Summary */}
      {userType === 'patient' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Billing Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.paid_amount || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                ${invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {invoices.filter(inv => inv.status !== 'paid').length}
              </div>
              <div className="text-sm text-gray-600">Pending Invoices</div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {userType === 'patient' ? 'My Invoices' : 'Invoices'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                {userType === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                {canProcessPayments && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  {userType === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.patients?.first_name} {invoice.patients?.last_name}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${invoice.total_amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${invoice.paid_amount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                  </td>
                  {canProcessPayments && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {invoice.status !== 'paid' && (
                        <button
                          onClick={() => openPaymentModal(invoice)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Receive Payment
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={userType === 'admin' ? 7 : 6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Table (Admin only) */}
      {userType === 'admin' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.slice(0, 10).map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.invoices?.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.invoices?.patients?.first_name} {transaction.invoices?.patients?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${transaction.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paymentMethodColors[transaction.payment_method] || 'bg-gray-100 text-gray-800'}`}>
                        {transaction.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Invoice Modal (Admin only) */}
      {showInvoiceModal && userType === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Invoice</h2>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient *</label>
                <select
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Appointment (Optional)</label>
                <select
                  name="appointment_id"
                  value={formData.appointment_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Appointment</option>
                  {appointments.map(appointment => (
                    <option key={appointment.id} value={appointment.id}>
                      {new Date(appointment.appointment_date).toLocaleDateString()} - {appointment.patients?.first_name} {appointment.patients?.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount ($) *</label>
                <input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Payment Modal (Admin only) */}
      {showPaymentModal && selectedInvoice && userType === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Process Payment</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Invoice: {selectedInvoice.invoice_number}</p>
              <p className="text-sm text-gray-600">Patient: {selectedInvoice.patients?.first_name} {selectedInvoice.patients?.last_name}</p>
              <p className="text-sm text-gray-600">Total Amount: ${selectedInvoice.total_amount}</p>
              <p className="text-sm text-gray-600">Already Paid: ${selectedInvoice.paid_amount || 0}</p>
              <p className="text-sm font-semibold text-gray-800">
                Balance Due: ${selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0)}
              </p>
            </div>
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($) *</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handlePaymentInputChange}
                  step="0.01"
                  min="0"
                  max={selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                <select
                  name="payment_method"
                  value={paymentData.payment_method}
                  onChange={handlePaymentInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="insurance">Insurance</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;