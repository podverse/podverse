import { AppDataSourceRead } from '@orm/db/index.js';
import { Category } from '@orm/entities/category.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let allCategories: any[] = [];

export class CategoryService {
  private repositoryRead = AppDataSourceRead.getRepository(Category);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(id: number): Promise<any | null> {
    if (!id) {
      return null;
    }
    const categoryRaw = await this.repositoryRead.findOne({
      where: { id },
      relations: ['parent_id'],
    });
    const parsedCategory = {
      ...categoryRaw,
      parent: categoryRaw?.parent_id || null,
    };
    delete parsedCategory.parent_id;
    return parsedCategory;
  }

  async setCategoryCache(): Promise<void> {
    const allCategoriesRaw = await this.repositoryRead.find({ relations: ['parent_id'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedCategories = allCategoriesRaw.map((category: any) => {
      return {
        id: category.id,
        parent_id: category?.parent_id?.id || null,
        display_name: category.display_name,
        slug: category.slug,
        mapping_key: category.mapping_key,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryMap = new Map<number, any>();

    parsedCategories.forEach((category) => {
      categoryMap.set(category.id, category);
    });

    parsedCategories.forEach((category) => {
      if (category.parent_id) {
        const parentCategory = categoryMap.get(category.parent_id);
        if (parentCategory) {
          if (!parentCategory.children) {
            parentCategory.children = [];
          }
          const copyCategory = { ...category };
          delete copyCategory.parent_id;
          parentCategory.children.push(copyCategory);
        }
      } else {
        delete category.parent_id;
      }
    });

    const finalCategories = parsedCategories.filter((category) => !category.parent_id);

    allCategories = finalCategories;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAll(): Promise<any[]> {
    return allCategories;
  }
}
