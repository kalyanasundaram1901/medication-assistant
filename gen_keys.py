from pywebpush import Vapid
import base64

def generate_vapid_keys():
    vapid = Vapid()
    # For some versions of pywebpush, generate_keys might not exist or be different
    # But usually Vapid() constructor or a method handles it.
    # Let's try the library's way to get a clean key set.
    try:
        # Some versions use this:
        from pywebpush import vapid_auth_issue
        keys = vapid_auth_issue()
        return keys['private_key'], keys['public_key']
    except:
        # Fallback to direct Vapid object manipulation
        vapid = Vapid()
        # This is a bit more complex manually, let's try to find the standard way
        # Actually, let's just use the cryptographically correct way if the library is being difficult
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        
        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()
        
        # Private key bitstring
        priv_bytes = private_key.private_numbers().private_value.to_bytes(32, 'big')
        priv_b64 = base64.urlsafe_b64encode(priv_bytes).decode('utf-8').strip('=')
        
        # Public key bitstring (uncompressed point)
        pub_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode('utf-8').strip('=')
        
        return priv_b64, pub_b64

priv, pub = generate_vapid_keys()
print(f"VAPID_PRIVATE_KEY={priv}")
print(f"VAPID_PUBLIC_KEY={pub}")
