import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../utils/formatPrice';
import { type WishlistItem } from '../../services/wishlistService';
import { apiClient } from '../../api/axios';
import { getImageUrl } from '../../utils/getImageUrl';
import { Loader } from '../../components/ui/Loader';
import { useInView } from '../../hooks/useInView';


export const Wishlist: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();
  const { productIds, removeFromWishlist } = useWishlist();
  const { ref, inView } = useInView<HTMLDivElement>();

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
      size: item.variant.size,
      originalPrice: item.variant.price,
      finalPrice: item.variant.price
    });
    // Optional: remove from wishlist after adding to cart
    handleRemove(item.variant.id);
  };

  if (isLoading) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16 min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-2 block">Saved Items</span>
          <h1 className="font-display-sm text-display-sm text-on-surface">My Wishlist</h1>
        </div>
        <p className="text-on-surface-variant font-label-md">{wishlist.length} Items</p>
      </div>

      {wishlist.length > 0 ? (
        <div ref={ref} className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 reveal ${inView ? 'in-view' : ''}`}>
          {wishlist.map((item, idx) => (
            <div key={item.id} className={`card flex flex-col overflow-hidden stagger-${(idx % 3) + 1}`}>
              <div className="product-media aspect-square bg-surface-variant">
                {item.variant.image ? (
                  <img src={getImageUrl(item.variant.image)} alt={item.variant.productName || 'Product'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
                <button
                  onClick={() => handleRemove(item.variant.id)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 line-clamp-1">
                    <Link
                      to={`/product/${item.variant.productId}`}
                      className="link-underline rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {item.variant.productName || 'Unknown Product'}
                    </Link>
                  </h3>
                  <div className="text-on-surface-variant font-body-sm text-body-sm leading-relaxed mb-3">
                    Size: {item.variant.size}
                  </div>
                  <div className="font-headline-sm text-headline-sm font-medium text-on-surface">
                    {formatPrice(item.variant.price)}
                  </div>
                </div>
                <button
                  onClick={() => handleAddToCart(item)}
                  className="btn btn-primary mt-5 w-full !px-4 !py-2.5 gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                  Move to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-20 px-6 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest max-w-2xl mx-auto mt-12">
          <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-accent text-2xl">favorite_border</span>
          </div>
          <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">Your Wishlist Is Empty</h2>
          <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed max-w-md">
            Save your favorite perfumes and attars here to find them quickly later. Browse our collection to start curating your perfect scent wardrobe.
          </p>
          <Link to="/collection" className="btn btn-primary inline-flex items-center">
            Explore Collection
          </Link>
        </div>
      )}
    </div>
  );
};
