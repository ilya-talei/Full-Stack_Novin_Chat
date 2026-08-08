function Button({ type, className }) {
  return <button className={className + type}>{type}</button>;
}

export default Button;
