"""Tests for batools.encryption (requires pycryptodome + xxhash).

These run automatically in CI (deps installed via requirements-test.txt).
Locally, if pycryptodome/xxhash are not installed, the whole class is skipped
so the rest of the suite still runs.
"""

import unittest

try:
    from batools.encryption import (
        MersenneTwister,
        convert_string,
        create_key,
        encrypt_string,
        xor,
        xor_with_key,
        zip_password,
    )
    _HAVE_DEPS = True
except ImportError:
    _HAVE_DEPS = False


@unittest.skipUnless(_HAVE_DEPS, "requires pycryptodome + xxhash")
class TestEncryption(unittest.TestCase):
    def test_xor_roundtrip_equal_length_key(self):
        key = b"0123456789abcdef"
        data = b"hello world!!!"
        self.assertEqual(xor(xor(data, key), key), data)

    def test_xor_handles_shorter_key(self):
        key = b"abc"
        data = b"some longer payload"
        self.assertEqual(xor(xor(data, key), key), data)

    def test_create_key_deterministic(self):
        self.assertEqual(create_key("GameMainConfig", 15), create_key("GameMainConfig", 15))
        self.assertEqual(len(create_key("x", 8)), 8)

    def test_xor_with_key_roundtrip(self):
        data = b"payload-bytes-123456"
        self.assertEqual(xor_with_key("k", xor_with_key("k", data)), data)

    def test_string_encrypt_decrypt_roundtrip(self):
        key = create_key("cfg", 16)
        enc = encrypt_string("蔚蓝档案", key)
        self.assertIsInstance(enc, str)
        self.assertEqual(convert_string(enc, key), "蔚蓝档案")

    def test_zip_password_deterministic_and_bytes(self):
        p1 = zip_password("bundles")
        p2 = zip_password("bundles")
        self.assertEqual(p1, p2)
        self.assertIsInstance(p1, bytes)

    def test_mersenne_next_bytes_deterministic(self):
        a = MersenneTwister(123).next_bytes(16)
        b = MersenneTwister(123).next_bytes(16)
        self.assertEqual(a, b)


if __name__ == "__main__":
    unittest.main()
