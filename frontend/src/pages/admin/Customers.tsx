import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminCustomerService, type CustomerListResponse } from '../../services/adminCustomerService';
import { formatPrice } from '../../utils/formatPrice';
import { Pagination } from '../../components/ui/Pagination';
import { downloadCSV } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

export const Customers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers'>('customers');
  const [customers, setCustomers] = useState<CustomerListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  const fetchCustomers = async (pageOverride?: number) => {
    try {
      setIsLoading(true);
      const params: any = { page: pageOverride ?? currentPage, size: 10 };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await adminCustomerService.getCustomers(params);
      setCustomers(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    searchParams.set('page', page.toString());
    setSearchParams(searchParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchParams.set('page', '0'); // reset to page 0 on new search
    setSearchParams(searchParams);
    fetchCustomers(0);
  };

  const handleExportCSV = async () => {
    try {
      const toastId = toast.loading('Exporting customers...');
      const params: any = { page: 0, size: 10000 }; // get max amount
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await adminCustomerService.getCustomers(params);
      
      const exportData = (res.content || []).map((c: any) => ({
        'Customer ID': c.id,
        'First Name': c.firstName,
        'Last Name': c.lastName,
        'Email': c.email,
        'Phone': c.phone,
        'Total Orders': c.totalOrders,
        'Lifetime Spending': c.lifetimeSpending,
        'Status': c.active ? 'Active' : 'Disabled',
        'Registration Date': new Date(c.registrationDate).toLocaleDateString()
      }));
      
      downloadCSV(exportData, 'Customers');
      toast.success('Customers exported successfully', { id: toastId });
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Failed to export customers');
    }
  };

  return (
    <>
      {/* Page Header & Tabs */}
      <div className="mb-10 flex flex-col gap-6">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Platform Management</h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-outline-variant w-fit">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 font-label-md text-label-md transition-all uppercase tracking-wider text-primary border-b-2 border-primary font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
          >
            Customers
          </button>
        </div>
      </div>

      {/* TAB CONTENT: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="animate-in fade-in duration-300">
          {/* Tools Row */}
          <div className="flex justify-between items-center mb-6">
            <p className="font-body-md text-on-surface-variant">Showing <span className="font-semibold text-on-surface">{customers.length}</span> of <span className="font-semibold text-on-surface">{totalElements}</span> registered users</p>
            <div className="flex gap-4 items-center">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search customers..."
                  className="bg-surface border border-outline-variant text-sm rounded-DEFAULT py-2 pl-4 pr-10 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm">
                  <span className="material-symbols-outlined text-[18px]">search</span>
                </button>
              </form>
              <button type="button" className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface text-sm font-medium hover:border-primary hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
              </button>
              <button onClick={handleExportCSV} type="button" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-medium hover:bg-surface-tint transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
              </button>
            </div>
          </div>

          {/* Customer List Card */}
          <div className="table-shell shadow-[0_10px_30px_rgba(18,28,42,.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="w-16">Profile</th>
                    <th>Client Name</th>
                    <th>Contact Info</th>
                    <th className="text-right">Total Orders</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">Loading customers...</td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">No customers found.</td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="group cursor-pointer">
                        <td data-label="Profile">
                          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary font-semibold text-sm">
                            {customer.firstName.charAt(0)}{customer.lastName ? customer.lastName.charAt(0) : ''}
                          </div>
                        </td>
                        <td data-label="Client Name">
                          <div className="font-body-md font-medium text-on-surface">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            Joined {new Date(customer.registrationDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td data-label="Contact Info">
                          <div className="font-body-md text-on-surface text-sm">{customer.email}</div>
                          <div className="text-xs text-outline mt-0.5">{customer.phone}</div>
                        </td>
                        <td data-label="Total Orders" className="text-right font-headline-md text-base text-primary">
                          {customer.totalOrders}
                          <div className="text-xs text-on-surface-variant mt-0.5 font-normal">
                            Spend: {formatPrice(customer.lifetimeSpending || 0)}
                          </div>
                        </td>
                        <td data-label="Actions" className="text-right">
                          <button type="button" className="p-2 rounded-full text-outline hover:text-primary hover:bg-surface-container-low transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-6 border-t border-outline-variant flex justify-center bg-surface-bright">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      )}

      
      <div className="h-section-gap"></div>
    </>
  );
};
