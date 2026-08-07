import { Link } from 'react-router-dom';
import styles from '@/styles/JoinForm.module.css';

export function ThankYouPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.successState}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            Received
          </div>
          <h1 className={styles.headline}>Logged.</h1>
          <p className={styles.lede}>
            We read every submission. If there&apos;s a fit, we&apos;ll reach out.
          </p>
          <Link to="/">
            <button type="button" className={styles.backButton}>
              Submit another application
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}