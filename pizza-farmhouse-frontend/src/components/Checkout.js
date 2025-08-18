import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLoader, FiCheckCircle, FiMapPin, FiHome, FiCreditCard, FiDollarSign } from 'react-icons/fi';
import StarBorder from './StarBorder';

// --- Reusable UI Components ---
const Input = (props) => (
  <div>
    <label htmlFor={props.name} className="block text-sm font-medium text-gray-700">{props.label}</label>
    <input {...props} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"/>
  </div>
);

const Button = ({ isLoading, disabled, children, ...props }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    {...props}
    disabled={isLoading || disabled}
    className="w-full flex justify-center bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
  >
    {isLoading ? <FiLoader className="animate-spin" size={24} /> : children}
  </motion.button>
);

const RadioCard = ({ id, value, checked, onChange, label, icon }) => (
  <div>
    <input type="radio" id={id} name="locationType" value={value} checked={checked} onChange={onChange} className="hidden" />
    <motion.label
      htmlFor={id}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${checked ? 'bg-orange-100 border-primary ring-2 ring-primary' : 'bg-white border-gray-300 hover:border-gray-400'}`}
    >
      <div className="mr-4 text-primary">{icon}</div>
      <span className="font-semibold text-secondary">{label}</span>
    </motion.label>
  </div>
);

// --- Main Checkout Component ---
export default function Checkout({ onOrderPlaced }) {
  const { cart, dispatch } = useCart();
  const { currentUser } = useAuth();
  const [step, setStep] = useState(currentUser ? 'location' : 'details');
  const [form, setForm] = useState({
    name: '', phone: '', locationType: 'university', gateNumber: '',
    address: '', instructions: '', paymentMethod: 'CashOnDelivery',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (currentUser) {
      const fetchUserData = async () => {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile(data);
          setForm(prev => ({ ...prev, name: data.name || '', phone: data.phone || '' }));
        }
      };
      fetchUserData();
    }
  }, [currentUser]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePlaceOrder = async () => {
    if (form.locationType === 'university' && !form.gateNumber) return toast.error('Please select a gate number.');
    if (form.locationType === 'other' && !form.address) return toast.error('Please provide your address.');
    if (!currentUser) {
        toast.error("You must be logged in to place an order.");
        return;
    }

    setIsLoading(true);
    const finalAddress = form.locationType === 'university' ? `Jaypee University, Anoopshahr - Gate ${form.gateNumber}` : form.address;
    
    const orderData = {
      userId: currentUser.uid,
      customer: { name: form.name, phone: form.phone },
      address: finalAddress,
      instructions: form.instructions,
      paymentMethod: form.paymentMethod,
      items: cart,
      total: cartTotal,
      status: 'Order Placed',
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), orderData);
      dispatch({ type: 'CLEAR_CART' });
      setStep('done');
      if (onOrderPlaced) {
        setTimeout(() => onOrderPlaced(docRef.id), 3000);
      }
    } catch (error) {
      console.error("Error placing order: ", error);
      toast.error('Failed to place order. Please try again.');
      setIsLoading(false);
    }
  };

  // --- RESTORED: Your full multi-step UI logic ---
  const renderStep = () => {
    switch (step) {
      case 'details':
        return (
          <motion.div key="details" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className="space-y-4">
            <h3 className="font-bold text-lg text-secondary">Your Details</h3>
            <Input label="Your Name" name="name" value={form.name} onChange={handleChange} required />
            <Input label="10-Digit Mobile Number" name="phone" type="tel" value={form.phone} onChange={handleChange} required />
            <Button onClick={() => {
              if (!form.name || !form.phone.match(/^[6-9]\d{9}$/)) {
                return toast.error('Please enter a valid name and phone number.');
              }
              setStep('location');
            }}>Continue</Button>
          </motion.div>
        );
      case 'location':
        return (
          <motion.div key="location" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className="space-y-4">
            <h3 className="font-bold text-lg text-secondary">Where should we deliver?</h3>
            <RadioCard id="uni" value="university" checked={form.locationType === 'university'} onChange={handleChange} name="locationType" label="Jaypee University, Anoopshahr" icon={<FiMapPin size={24} />} />
            <RadioCard id="other" value="other" checked={form.locationType === 'other'} onChange={handleChange} name="locationType" label="Other Location (within 3-4km)" icon={<FiHome size={24} />} />
            {userProfile?.addresses?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mt-4">Or select a saved address</label>
                <motion.select
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onChange={(e) => {
                    if (e.target.value) {
                      setForm(prev => ({...prev, address: e.target.value, locationType: 'other'}));
                    }
                  }} 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">-- Choose a saved address --</option>
                  {userProfile.addresses.map(addr => <option key={addr} value={addr}>{addr}</option>)}
                </motion.select>
              </div>
            )}
            {form.locationType && <Button onClick={() => setStep('address')}>Continue</Button>}
          </motion.div>
        );
      case 'address':
        return (
          <motion.div key="address" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className="space-y-4">
            <h3 className="font-bold text-lg text-secondary">Delivery Details</h3>
            {form.locationType === 'university' && (
              <>
                <Input label="Selected Location" name="uni_location" value="Jaypee University, Anoopshahr" disabled readOnly />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Gate</label>
                  <motion.select
                    name="gateNumber"
                    value={form.gateNumber}
                    onChange={handleChange}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="">-- Select Gate --</option>
                    <option value="1">Gate 1</option>
                    <option value="2">Gate 2</option>
                  </motion.select>
                </div>
              </>
            )}
            {form.locationType === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Delivery Address</label>
                <textarea name="address" rows="3" value={form.address} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" placeholder="e.g., House No., Street Name, Landmark..." required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Delivery Instructions (Optional)</label>
              <input name="instructions" value={form.instructions} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary" placeholder="e.g., Call upon arrival" />
            </div>
            <Button onClick={() => setStep('payment')}>Proceed to Payment</Button>
          </motion.div>
        );
      case 'payment':
        return (
          <motion.div key="payment" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className="space-y-4">
            <h3 className="font-bold text-lg text-secondary">How would you like to pay?</h3>
            <RadioCard id="cod" value="CashOnDelivery" checked={form.paymentMethod === 'CashOnDelivery'} onChange={handleChange} name="paymentMethod" label="Cash on Delivery" icon={<FiDollarSign size={24} />} />
            <div>
              <input type="radio" id="online" name="paymentMethod" disabled className="hidden" />
              <label htmlFor="online" className="flex items-center p-4 border rounded-lg cursor-not-allowed bg-gray-100 text-gray-400">
                <div className="mr-4"><FiCreditCard size={24} /></div>
                <span className="font-semibold">Pay Online (Coming Soon)</span>
              </label>
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-center font-bold text-xl mb-4">
                <span>To Pay:</span>
                <span className="text-primary">₹{cartTotal}</span>
              </div>
              <Button onClick={handlePlaceOrder} isLoading={isLoading}>Place Order</Button>
            </div>
          </motion.div>
        );
      case 'done':
        return (
          <motion.div key="success" className="text-center py-8" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <StarBorder className="rounded-xl">
              <div className="bg-white p-6 rounded-lg">
                <FiCheckCircle className="mx-auto text-green-500 mb-4" size={60} />
                <h3 className="text-2xl font-bold text-secondary">Order Placed!</h3>
                <p className="text-gray-600 mt-2">Thank you! Your pizza is on its way.</p>
              </div>
            </StarBorder>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div>
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </motion.div>
  );
}