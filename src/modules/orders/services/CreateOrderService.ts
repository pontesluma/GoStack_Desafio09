import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exist.');
    }

    const productsId = Array.from(products, product => {
      return { id: product.id };
    });

    const productsFound = await this.productsRepository.findAllById(productsId);

    if (productsFound.length !== products.length) {
      throw new AppError('Cannot create order with invalid products.');
    }

    const productsQuantityUpdate: IProduct[] = [];

    const productsArray = products.map((product, index) => {
      productsQuantityUpdate.push({
        quantity: productsFound[index].quantity - product.quantity,
        id: product.id,
      });

      if (product.quantity > productsFound[index].quantity) {
        throw new AppError('Products with insufficient quantities.');
      }

      return {
        product_id: product.id,
        price: productsFound[index].price,
        quantity: product.quantity,
      };
    });

    await this.productsRepository.updateQuantity(productsQuantityUpdate);

    const order = await this.ordersRepository.create({
      customer,
      products: productsArray,
    });

    return order;
  }
}

export default CreateOrderService;
