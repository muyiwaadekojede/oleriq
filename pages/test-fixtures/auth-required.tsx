import type { GetServerSideProps } from 'next';
import Head from 'next/head';

type Props = {
  authenticated: boolean;
};

export default function AuthRequiredFixture({ authenticated }: Props) {
  if (!authenticated) {
    return (
      <>
        <Head>
          <title>Fixture paywall</title>
        </Head>
        <main>
          <h1>Subscriber-only article</h1>
          <p>This page appears to be behind a paywall or requires a login.</p>
          <p>Sign in to read the full article.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Authenticated fixture article</title>
        <meta property="og:title" content="Authenticated fixture article" />
        <meta property="og:site_name" content="Oleriq Fixture" />
        <meta property="og:description" content="Authenticated extraction fixture for Oleriq tests." />
      </Head>
      <main>
        <article>
          <h1>Authenticated fixture article</h1>
          <p>
            This fixture exists to prove that Oleriq can reuse an imported authenticated browser session when a page
            would otherwise look closed to the public. The content is intentionally long enough to pass the extractor's
            readable-text checks without needing a second special-case code path.
          </p>
          <p>
            Teams usually hit this need when important pages live behind a login, a paywall, or an account dashboard.
            The expected product behavior is not to pretend the page was public. The expected behavior is to say that a
            logged-in session was used, preserve the same trust surface, and still convert the output through the normal
            export formats.
          </p>
          <p>
            This paragraph gives the article enough body text for the readability parser, the structure recovery layer,
            and the export pipeline to behave like a real extraction instead of an edge-only fake. That keeps the auth
            test close to the production path.
          </p>
        </article>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  const cookieHeader = req.headers.cookie || '';
  const authenticated = /(?:^|;\s*)oleriq_fixture_auth=granted(?:;|$)/.test(cookieHeader);

  return {
    props: {
      authenticated,
    },
  };
};
