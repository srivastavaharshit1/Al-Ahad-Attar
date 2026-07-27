import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contactService, type ContactMessage } from '../../services/contactService';
import toast from 'react-hot-toast';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';

export const ContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  const fetchMessages = async (page = 0) => {
    setIsLoading(true);
    try {
      const response = await contactService.getAllInquiries({
        page,
        size: 10,
        status: statusFilter || undefined
      });
      if (response) {
        setMessages(response.content || []);
        setTotalPages(response.totalPages || 0);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load inquiries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(currentPage);
  }, [currentPage, statusFilter]);

  const handlePageChange = (page: number) => {
    setSearchParams({ page: page.toString() });
  };

  const handleStatusUpdate = async (id: number, status: 'UNREAD' | 'READ' | 'REPLIED') => {
    try {
      await contactService.updateStatus(id, status);
      toast.success(`Marked as ${status}`);
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({ ...selectedMessage, status });
      }
      fetchMessages(currentPage);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await contactService.deleteInquiry(deleteConfirmId);
      toast.success('Message deleted');
      if (selectedMessage?.id === deleteConfirmId) setSelectedMessage(null);
      setDeleteConfirmId(null);
      fetchMessages(currentPage);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Customer Inquiries</h2>
          <p className="text-on-surface-variant mt-2">Manage contact form submissions</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface border border-outline-variant rounded px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="UNREAD">Unread</option>
            <option value="READ">Read</option>
            <option value="REPLIED">Replied</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="py-4 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Date</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Name</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Type</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 font-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant font-body-md">
                    No inquiries found.
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className={`border-b border-outline-variant hover:bg-surface-container-lowest transition-colors ${msg.status === 'UNREAD' ? 'bg-primary-container/10' : ''}`}>
                    <td className="py-4 px-6 font-body-md text-on-surface">{formatDate(msg.createdAt)}</td>
                    <td className="py-4 px-6">
                      <p className="font-body-md text-on-surface font-medium">{msg.firstName} {msg.lastName}</p>
                      <p className="text-sm text-on-surface-variant">{msg.email}</p>
                    </td>
                    <td className="py-4 px-6 font-body-md text-on-surface capitalize">{msg.inquiryType.replace('-', ' ')}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                        msg.status === 'UNREAD' ? 'bg-error-container text-on-error-container' :
                        msg.status === 'READ' ? 'bg-secondary-container text-on-secondary-container' :
                        'bg-primary-container text-on-primary-container'
                      }`}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button onClick={() => setSelectedMessage(msg)} className="text-primary hover:text-primary-fixed transition-colors font-label-sm uppercase" title="View Message">
                        View
                      </button>
                      <button onClick={() => handleDelete(msg.id)} className="text-error hover:text-error/80 transition-colors font-label-sm uppercase ml-4" title="Delete">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center p-6 border-t border-outline-variant bg-surface-bright">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start p-6 border-b border-outline-variant">
              <div>
                <h3 className="font-headline-md text-xl">Inquiry from {selectedMessage.firstName} {selectedMessage.lastName}</h3>
                <p className="text-on-surface-variant text-sm mt-1">{selectedMessage.email} • {formatDate(selectedMessage.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Inquiry Type</p>
                <p className="font-body-md capitalize">{selectedMessage.inquiryType.replace('-', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Message</p>
                <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded whitespace-pre-wrap font-body-md text-on-surface">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 p-6 border-t border-outline-variant bg-surface-container-low">
              {selectedMessage.status === 'UNREAD' && (
                <button onClick={() => handleStatusUpdate(selectedMessage.id, 'READ')} className="px-4 py-2 border border-primary text-primary font-medium rounded hover:bg-primary-container/20 transition-colors">
                  Mark as Read
                </button>
              )}
              {selectedMessage.status !== 'REPLIED' && (
                <button onClick={() => handleStatusUpdate(selectedMessage.id, 'REPLIED')} className="px-4 py-2 bg-primary text-on-primary font-medium rounded hover:bg-primary/90 transition-colors">
                  Mark as Replied
                </button>
              )}
              <a 
                href={`mailto:${selectedMessage.email}?subject=Re: Your inquiry to Al Ahad Attars`}
                className="px-4 py-2 border border-outline-variant text-on-surface font-medium rounded hover:bg-surface-container transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                Reply via Email
              </a>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Message"
        description="Are you sure you want to delete this contact message? This action cannot be undone."
        entityName={messages.find(m => m.id === deleteConfirmId) ? `Message from ${messages.find(m => m.id === deleteConfirmId)?.firstName} ${messages.find(m => m.id === deleteConfirmId)?.lastName}` : undefined}
        confirmText="Delete Message"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
