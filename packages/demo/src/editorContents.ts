export const editorContents = `
import { createClient, OAuthStrategy } from '@wix/sdk';
import { products } from '@wix/stores';

const myWixClient = createClient({
    modules: { products },
    auth: OAuthStrategy({ clientId: '433368fd-cf11-41ff-b82f-239d92c15bed' }),
});

const printProducts = async () => {
    const productList = await myWixClient.products.queryProducts().find();
    console.log('My Products:');
    console.log('Total: ', productList.items.length);
    console.log(
        productList.items
            .map((item) => item.name)
            .join('\\n')
    );
};
`;
