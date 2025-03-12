import React from 'react';
import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';
import { renderStatic } from '@emotion/server';
import { createEmotionCache } from '../utils/createEmotionCache';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const originalRenderPage = ctx.renderPage;
    
    // Tạo cache instance
    const cache = createEmotionCache();

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App: any) => (props) => <App emotionCache={cache} {...props} />,
      });

    const initialProps = await Document.getInitialProps(ctx);
    
    // Trích xuất CSS
    const { ids, css } = await renderStatic(() => {
      return initialProps.html;
    });

    return {
      ...initialProps,
      styles: [
        ...React.Children.toArray(initialProps.styles),
        <style
          key="emotion"
          data-emotion={`css ${ids.join(' ')}`}
          dangerouslySetInnerHTML={{ __html: css }}
        />
      ],
    };
  }

  render() {
    return (
      <Html lang="vi">
        <Head>
          <meta charSet="utf-8" />
          <meta name="theme-color" content="#2AABEE" />
          <meta name="description" content="Lưu trữ đám mây không giới hạn bằng Telegram" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/logo192.png" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 