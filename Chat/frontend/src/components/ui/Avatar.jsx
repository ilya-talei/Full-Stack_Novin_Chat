export default function Avatar({ src, alt, size = 'md', online }) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt={alt}
        className={`${sizes[size]} rounded-full object-cover bg-ngray-500`}
      />
      {online !== undefined && (
        <span
          className={`absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-ngray-900 ${online ? 'bg-nsuccess' : 'bg-nneutral-800'}`}
        />
      )}
    </div>
  );
}
