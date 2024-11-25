'use client';

import { useEffect, useState } from 'react';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const token = userData?.data?.token;
        setCurrentUser(userData);

        if (!token) {
          throw new Error('No token found. Please log in.');
        }

        const response = await fetch('http://localhost:3000/api/list-all-products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch product listings');
        }

        const data = await response.json();
        setProducts(data?.data?.docs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Handle Make an Offer form submission
  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const token = currentUser?.data?.token;
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const response = await fetch(`http://localhost:3000/api/product/${selectedProduct._id}/make-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offer_price: offerPrice,
          offer_description: offerDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to make an offer');
      }

      const data = await response.json();
      alert('Offer successfully made!');
      setOfferPrice('');
      setOfferDescription('');
      setSelectedProduct(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-2xl font-bold mb-5">Product Listings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((product) => (
          <div
            key={product._id}
            className="p-5 border rounded-lg shadow-md flex flex-col items-start"
          >
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-40 object-cover rounded-md mb-4"
            />
            <h2 className="text-lg font-semibold">{product.title}</h2>
            <p className="text-gray-500 mb-2">{product.description}</p>
            <p className="text-blue-600 font-bold mb-4">Price: ${product.price}</p>
            {currentUser?.data?._id !== product?.createdBy && (
              <button
                onClick={() => setSelectedProduct(product)}
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Make an Offer
              </button>
            )}

          </div>
        ))}
      </div>

      {/* Make an Offer Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-3">Make an Offer for {selectedProduct.title}</h2>
            <form onSubmit={handleMakeOffer}>
              <div className="mb-3">
                <label htmlFor="offer_price" className="block text-sm font-medium mb-1">
                  Offer Price
                </label>
                <input
                  type="number"
                  id="offer_price"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full border rounded-md p-2"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="offer_description" className="block text-sm font-medium mb-1">
                  Offer Description
                </label>
                <textarea
                  id="offer_description"
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  className="w-full border rounded-md p-2"
                  rows="3"
                  required
                ></textarea>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
                >
                  Submit Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;