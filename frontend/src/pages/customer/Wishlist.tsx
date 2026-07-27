import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../utils/formatPrice';
import { type WishlistItem } from '../../services/wishlistService';
import { apiClient } from '../../api/axios';
import { getImageUrl } from '../../utils/getImageUrl';


export const Wishlist: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();
  const { productIds, removeFromWishlist } = useWishlist();

  useEffect(() => {
    const fetchWishlistItems = async () => {
      try {
        setIsLoading(true);
        const promises = productIds.map(id => apiClient.get(`/variants/${id}`));
        const responses = await Promise.all(promises);
        const fetchedItems = responses.map((res) => ({
          id: res.data.data.id,
          variant: res.data.data,
          createdAt: new Date().toISOString()
        }));
        setWishlist(fetchedItems);
      } catch (error) {
        console.error("Failed to fetch wishlist items", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productIds.length > 0) {
      fetchWishlistItems();
    } else {
      setWishlist([]);
      setIsLoading(false);
    }
  }, [productIds]);

  const handleRemove = async (variantId: number) => {
    try {
      await removeFromWishlist(variantId.toString());
      setWishlist(prev => prev.filter(item => item.variant.id !== variantId));
    } catch (error) {
      console.error("Failed to remove item", error);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      id: Math.random().toString(),
      productId: item.variant.productId?.toString() || '0',
      name: item.variant.productName || 'Product',
      quantity: 1,
      image: item.variant.image,
      variantId: item.variant.id,
      size: item.variant.size
    });
    // Optional: remove from wishlist after adding to cart
    handleRemove(item.variant.id);
  };

  if (isLoading) {
    return <div className="p-12 text-center">Loading your wishlist...</div>;
  }

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display-sm text-display-sm text-on-surface">My Wishlist</h1>
        <p className="text-on-surface-variant font-label-md">{wishlist.length} Items</p>
      </div>

      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map(item => (
            <div key={item.id} className="group flex flex-col bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden hover:shadow-[0_8px_24px_rgba(31,41,55,0.08)] transition-all duration-300">
              <div className="relative aspect-square bg-surface-variant overflow-hidden">
                {item.variant.image ? (
                  <img src={getImageUrl(item.variant.image)} alt={item.variant.productName || 'Product'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
                <button 
                  onClick={() => handleRemove(item.variant.id)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface transition-colors shadow-sm"
                  aria-label="Remove from wishlist"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex-1">
                  <div className="text-on-surface-variant font-label-sm text-label-sm tracking-wider uppercase mb-1">
                    Al Ahad
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    <Link to={`/product/${item.variant.productId}`}>{item.variant.productName || 'Unknown Product'}</Link>
                  </h3>
                  <div className="text-on-surface-variant font-body-sm text-body-sm mb-3">
                    Size: {item.variant.size}
                  </div>
                  <div className="font-headline-sm text-headline-sm font-medium text-on-surface">
                    {formatPrice(item.variant.price)}
                  </div>
                </div>
                <button 
                  onClick={() => handleAddToCart(item)}
                  className="mt-5 w-full py-2.5 px-4 bg-primary text-on-primary font-label-md text-label-md rounded-DEFAULT hover:bg-primary-container transition-colors shadow-[0_2px_8px_rgba(120,86,0,0.15)] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                  Move to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant p-12 rounded-DEFAULT text-center max-w-2xl mx-auto mt-12">
          <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl">favorite_border</span>
          </div>
          <h2 className="font-headline-lg mb-4">Your Wishlist is Empty</h2>
          <p className="text-on-surface-variant font-body-md mb-8">
            Save your favorite perfumes and attars here to find them quickly later. Browse our collection to start curating your perfect scent wardrobe.
          </p>
          <Link to="/collection" className="btn-primary px-8 py-3 inline-block rounded">
            Explore Collection
          </Link>
        </div>
      )}
    </div>
  );
};
