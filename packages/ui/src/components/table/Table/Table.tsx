import styles from './Table.module.scss';

type TableProps = {
  children: React.ReactNode;
  className?: string;
};

function TableComponent({ children, className }: TableProps) {
  return <table className={`${styles.root}${className ? ` ${className}` : ''}`}>{children}</table>;
}

function Head({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <tr>{children}</tr>;
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className={styles.headerCell}>
      {children}
    </th>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td>{children}</td>;
}

function ScrollContainer({ children }: { children: React.ReactNode }) {
  return <div className={styles.scrollContainer}>{children}</div>;
}

export const Table = Object.assign(TableComponent, {
  Head,
  Body,
  Row,
  HeaderCell,
  Cell,
  ScrollContainer,
});

export type { TableProps };
