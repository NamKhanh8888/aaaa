import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Card, Button, Form } from 'react-bootstrap';
import { useGetOrderDetailsQuery, usePayOrderMutation, useDeliverOrderMutation, useUpdateOrderStatusMutation, useGetPaypalClientIdQuery } from '../slices/ordersApiSlice';
import { getSocket } from '../services/socketService';
import { toast } from 'react-toastify';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useSelector } from 'react-redux';
import Message from '../components/Message';
import Loader from '../components/Loader';

const OrderScreen = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const { data: order, refetch, isLoading, error } = useGetOrderDetailsQuery(orderId);
  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();
  const [deliverOrder, { isLoading: loadingDeliver }] = useDeliverOrderMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const { data: paypal, isLoading: loadingPayPal, error: errorPayPal } = useGetPaypalClientIdQuery();

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

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
      if (data.orderId === orderId) {
        refetch();
        toast.info(`Order status updated to ${data.status}`);
      }
    });

    return () => {
      socket.off('orderUpdate');
    };
  }, [orderId, refetch]);

  useEffect(() => {
    if (!errorPayPal && !loadingPayPal && paypal?.clientId) {
      const loadPaypalScript = async () => {
        paypalDispatch({
          type: 'resetOptions',
          value: {
            'client-id': paypal.clientId,
            currency: 'USD',
          },
        });
        paypalDispatch({ type: 'setLoadingStatus', value: 'pending' });
      };
      if (order && !order.isPaid) {
        loadPaypalScript();
      }
    }
  }, [errorPayPal, loadingPayPal, order, paypal, paypalDispatch]);

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
      try {
        await payOrder({ orderId, details }).unwrap();
        refetch();
        toast.success('Order is paid');
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    });
  }

  function onError(err) {
    toast.error(err.message);
  }

  function createOrder(data, actions) {
    return actions.order
      .create({
        purchase_units: [
          {
            amount: { value: order.totalPrice },
          },
        ],
      })
      .then((orderID) => {
        return orderID;
      });
  }

  const deliverOrderHandler = async () => {
    try {
      await deliverOrder(orderId).unwrap();
      refetch();
      toast.success('Order delivered');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateOrderStatus({ orderId, status: newStatus }).unwrap();
      refetch();
      toast.success('Order status updated');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return isLoading ? (
    <Loader />
  ) : error ? (
    <Message variant='danger'>{error?.data?.message || error.error}</Message>
  ) : (
    <>
      <h1>Order {order._id}</h1>
      <Row>
        <Col md={8}>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              <h2>Shipping</h2>
              <p>
                <strong>Name: </strong> {order.user.name}
              </p>
              <p>
                <strong>Email: </strong>{' '}
                <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
              </p>
              <p>
                <strong>Address:</strong>
                {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                {order.shippingAddress.postalCode},{' '}
                {order.shippingAddress.country}
              </p>
              {order.isDelivered ? (
                <Message variant='success'>
                  Delivered on {order.deliveredAt.substring(0, 10)}
                </Message>
              ) : (
                <Message variant='danger'>Not Delivered</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Payment Method</h2>
              <p>
                <strong>Method: </strong>
                {order.paymentMethod}
              </p>
              {order.isPaid ? (
                <Message variant='success'>
                  Paid on {order.paidAt.substring(0, 10)}
                </Message>
              ) : (
                <Message variant='danger'>Not Paid</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Status</h2>
              {userInfo && userInfo.isAdmin ? (
                <Form.Select
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className='mb-3'
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <p>
                  <strong>Status: </strong>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                </p>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Items</h2>
              {order.orderItems.length === 0 ? (
                <Message>Order is empty</Message>
              ) : (
                <ListGroup variant='flush'>
                  {order.orderItems.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={1}>
                          <Image
                            src={item.image}
                            alt={item.name}
                            fluid
                            rounded
                          />
                        </Col>
                        <Col>
                          <Link to={`/product/${item.product}`}>
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={4}>
                          {item.qty} x ${item.price} = ${item.qty * item.price}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={4}>
          <Card>
            <ListGroup variant='flush'>
              <ListGroup.Item>
                <h2>Order Summary</h2>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Items</Col>
                  <Col>${order.itemsPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Shipping</Col>
                  <Col>${order.shippingPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Tax</Col>
                  <Col>${order.taxPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Total</Col>
                  <Col>${order.totalPrice}</Col>
                </Row>
              </ListGroup.Item>

              {!order.isPaid && (
                <ListGroup.Item>
                  {loadingPay && <Loader />}
                  {loadingPayPal ? (
                    <Loader />
                  ) : errorPayPal ? (
                    <Message variant='danger'>{errorPayPal?.data?.message || errorPayPal.error}</Message>
                  ) : (
                    <div>
                      <PayPalButtons
                        createOrder={createOrder}
                        onApprove={onApprove}
                        onError={onError}
                      ></PayPalButtons>
                    </div>
                  )}
                </ListGroup.Item>
              )}

              {loadingDeliver && <Loader />}

              {userInfo && userInfo.isAdmin && order.isPaid && !order.isDelivered && (
                <ListGroup.Item>
                  <Button
                    type='button'
                    className='btn btn-block'
                    onClick={deliverOrderHandler}
                  >
                    Mark As Delivered
                  </Button>
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default OrderScreen;
