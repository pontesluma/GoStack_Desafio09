import { getRepository, Repository } from 'typeorm';

import IOrdersRepository from '@modules/orders/repositories/IOrdersRepository';
import ICreateOrderDTO from '@modules/orders/dtos/ICreateOrderDTO';
import Order from '../entities/Order';
import OrdersProducts from '../entities/OrdersProducts';

class OrdersRepository implements IOrdersRepository {
  private ormRepository: Repository<Order>;

  private ordersProductsRepository: Repository<OrdersProducts>;

  constructor() {
    this.ormRepository = getRepository(Order);
    this.ordersProductsRepository = getRepository(OrdersProducts);
  }

  public async create({ customer, products }: ICreateOrderDTO): Promise<Order> {
    const order = this.ormRepository.create({ customer });
    await this.ormRepository.save(order);

    const orderProducts: OrdersProducts[] = [];

    products.forEach(product => {
      const orderProduct = this.ordersProductsRepository.create({
        order_id: order.id,
        product_id: product.product_id,
        quantity: product.quantity,
        price: product.price,
      });

      orderProducts.push(orderProduct);
    });

    await this.ordersProductsRepository.save(orderProducts);

    order.order_products = orderProducts;

    await this.ormRepository.save(order);

    return order;
  }

  public async findById(id: string): Promise<Order | undefined> {
    const findOrder = await this.ormRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!findOrder) {
      return undefined;
    }

    const findOrdersProduct = await this.ordersProductsRepository.find({
      where: { order_id: findOrder.id },
      relations: ['product'],
    });

    findOrder.order_products = findOrdersProduct;

    return findOrder;
  }
}

export default OrdersRepository;
