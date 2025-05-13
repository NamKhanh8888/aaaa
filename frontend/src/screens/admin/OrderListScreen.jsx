import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetOrdersQuery, useUpdateOrderStatusMutation } from '../../slices/ordersApiSlice';
import { getSocket } from '../../services/socketService';
import { toast } from 'react-toastify';
import { FaTimes } from 'react-icons/fa';
import Message from '../../components/Message';
import Loader from '../../components/Loader';
import { Button, Table, Form } from 'react-bootstrap';

const OrderListScreen = () => {
  const { data: orders, isLoading, error, refetch } = useGetOrdersQuery();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const statusOptions = [
    'pending',
    'processing',
    'awaiting_payment',
    'paid',
    'shipped',
    'delivered',
    'cancelled'
  ];

  useEffect(() => {
    const socket = getSocket();

    socket.on('orderUpdate', (data) => {
      // Refetch orders when an update is received
      refetch();
      toast.info(`Order ${data.orderId} status updated to ${data.status}`);
    });

    return () => {
      socket.off('orderUpdate');
    };
  }, [refetch]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus({ orderId, status: newStatus }).unwrap();
      refetch();
      toast.success('Order status updated');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <>
      <h1>Orders</h1>
      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error?.data?.message || error.error}</Message>
      ) : (
        <Table striped hover responsive className='table-sm'>
          <thead>
            <tr>
              <th>ID</th>
              <th>USER</th>
              <th>DATE</th>
              <th>TOTAL</th>
              <th>STATUS</th>
              <th>PAID</th>
              <th>DELIVERED</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>{order._id}</td>
                <td>{order.user && order.user.name}</td>
                <td>{order.createdAt.substring(0, 10)}</td>
                <td>${order.totalPrice}</td>
                <td>
                  <Form.Select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                    size="sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </Form.Select>
                </td>
                <td>
                  {order.isPaid ? (
                    order.paidAt.substring(0, 10)
                  ) : (
                    <FaTimes style={{ color: 'red' }} />
                  )}
                </td>
                <td>
                  {order.isDelivered ? (
                    order.deliveredAt.substring(0, 10)
                  ) : (
                    <FaTimes style={{ color: 'red' }} />
                  )}
                </td>
                <td>
                  <Link to={`/order/${order._id}`}>
                    <Button variant='light' className='btn-sm'>
                      Details
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
};

export default OrderListScreen;
