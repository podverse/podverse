import styles from '../../styles/components/Settings/SettingsWrapper.module.scss';

type SettingsWrapperProps = {
  children: React.ReactNode;
  removeWrapperMargin?: boolean;
};

export function SettingsWrapper({ children, removeWrapperMargin = false }: SettingsWrapperProps) {
  return (
    <div className={`${styles.wrapper} ${removeWrapperMargin ? styles.wrapperNoMargin : ''}`}>
      {children}
    </div>
  );
}
