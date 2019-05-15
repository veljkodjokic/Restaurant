-- phpMyAdmin SQL Dump
-- version 4.8.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 15, 2019 at 08:35 PM
-- Server version: 10.1.37-MariaDB
-- PHP Version: 7.3.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `restaurant`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Appetizers', '2019-05-05 13:31:07', '2019-05-05 13:31:07'),
(2, 'Entrees', '2019-05-04 22:00:00', '2019-05-04 22:00:00'),
(3, 'Drinks', '2019-05-05 13:31:42', '2019-05-15 18:34:08'),
(4, 'Desserts', '2019-05-05 13:31:42', '2019-05-05 13:31:42');

-- --------------------------------------------------------

--
-- Table structure for table `goods`
--

CREATE TABLE `goods` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `goods`
--

INSERT INTO `goods` (`id`, `name`, `created_at`, `updated_at`, `category_id`) VALUES
(1, 'Pizza', '2019-05-05 17:46:23', '2019-05-05 17:46:23', 2),
(2, 'Sandwich', '2019-05-05 17:46:23', '2019-05-05 17:46:23', 2),
(3, 'Coca-Cola', '2019-05-05 17:46:45', '2019-05-05 17:46:45', 3),
(4, 'Pepsi', '2019-05-05 17:46:45', '2019-05-05 17:46:45', 3),
(5, 'Cake', '2019-05-05 17:47:41', '2019-05-05 17:47:41', 4),
(6, 'Ice cream', '2019-05-05 17:47:41', '2019-05-13 17:24:54', 4),
(7, 'Snack', '2019-05-05 17:47:53', '2019-05-13 17:16:22', 1),
(9, 'Patsa', '2019-05-13 17:25:12', '2019-05-13 17:25:12', 2);

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(8,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `user_id`, `amount`, `created_at`, `updated_at`, `status`) VALUES
(1, 64, '0.00', '2019-05-07 19:13:21', '2019-05-15 18:34:50', 1),
(2, 64, '0.00', '2019-05-08 00:15:09', '2019-05-15 18:34:50', 1),
(3, 64, '751.98', '2019-05-08 00:16:14', '2019-05-08 01:42:15', 1),
(4, 64, '1850.00', '2019-05-08 01:40:37', '2019-05-15 18:34:50', 1),
(5, 64, '200.00', '2019-05-08 03:06:25', '2019-05-15 18:34:50', 1),
(6, 64, '1500.00', '2019-05-08 16:36:30', '2019-05-15 18:34:50', 1),
(7, 64, '1400.00', '2019-05-11 19:02:00', '2019-05-15 18:34:50', 1),
(8, 66, '0.00', '2019-05-13 20:47:10', '2019-05-15 18:03:11', 1),
(11, 64, '6999.00', '2019-04-07 22:00:00', '2019-04-16 22:00:00', 1),
(12, 66, '3100.99', '2019-05-14 02:30:08', '2019-05-14 02:30:19', 1),
(13, 66, '1601.49', '2019-05-15 18:00:26', '2019-05-15 18:00:40', 1);

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2014_10_12_000000_create_users_table', 1),
(2, '2019_04_26_092400_create_invoices_table', 1),
(3, '2019_04_26_092843_create_goods_table', 1),
(4, '2019_04_26_093023_create_tickets_table', 1),
(5, '2019_05_04_144238_create_categories_table', 1),
(6, '2019_05_04_145628_update_goods_table', 1),
(7, '2019_05_05_194005_create_portions_table', 1),
(8, '2019_05_06_002821_update_tickets_table', 1),
(9, '2019_05_07_211015_update_invoices_table', 1);

-- --------------------------------------------------------

--
-- Table structure for table `portions`
--

CREATE TABLE `portions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `portion` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(8,2) NOT NULL,
  `goods_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `portions`
--

INSERT INTO `portions` (`id`, `portion`, `price`, `goods_id`, `created_at`, `updated_at`) VALUES
(1, 'L', '800.00', 1, '2019-05-05 17:50:21', '2019-05-13 23:00:27'),
(2, 'XL', '1200.00', 1, '2019-05-05 17:50:21', '2019-05-05 17:50:21'),
(3, 'M', '100.00', 3, '2019-05-06 20:59:22', '2019-05-06 20:59:22'),
(4, 'L', '150.00', 3, '2019-05-06 20:59:22', '2019-05-06 20:59:22'),
(5, 'Small', '150.00', 2, '2019-05-07 18:33:21', '2019-05-07 18:33:21'),
(6, 'Medium', '200.00', 2, '2019-05-07 18:33:21', '2019-05-07 18:33:21'),
(7, 'Large', '300.99', 2, '2019-05-07 18:33:55', '2019-05-07 18:33:55'),
(8, 'Small', '100.00', 4, '2019-05-07 18:33:55', '2019-05-07 18:33:55'),
(9, 'Large', '150.00', 4, '2019-05-07 18:35:23', '2019-05-07 18:35:23'),
(10, 'Small', '150.00', 5, '2019-05-07 18:35:23', '2019-05-07 18:35:23'),
(11, 'Large', '250.00', 5, '2019-05-07 18:35:45', '2019-05-07 18:35:45'),
(12, 'Scoop', '50.00', 6, '2019-05-07 18:37:18', '2019-05-07 18:37:18'),
(13, 'Cup', '250.00', 6, '2019-05-07 18:37:18', '2019-05-07 18:37:18'),
(14, 'Medium', '200.00', 7, '2019-05-07 18:37:43', '2019-05-07 18:37:43'),
(15, 'M', '200.50', 9, '2019-05-13 20:29:13', '2019-05-13 20:29:13'),
(16, 'L', '500.50', 9, '2019-05-13 20:31:06', '2019-05-13 20:31:06'),
(17, 'XL', '800.00', 9, '2019-05-13 20:31:50', '2019-05-13 20:31:50');

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `portion_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`id`, `invoice_id`, `quantity`, `created_at`, `updated_at`, `portion_id`) VALUES
(1, 3, 1, '2019-05-08 00:39:57', '2019-05-08 00:39:57', 5),
(2, 3, 2, '2019-05-08 00:39:57', '2019-05-08 00:39:57', 7),
(3, 4, 1, '2019-05-08 02:57:58', '2019-05-08 02:57:58', 11),
(4, 4, 1, '2019-05-08 02:58:33', '2019-05-08 02:58:33', 6),
(5, 4, 1, '2019-05-08 02:58:48', '2019-05-08 02:58:48', 2),
(6, 4, 1, '2019-05-08 02:59:28', '2019-05-08 02:59:28', 3),
(7, 4, 1, '2019-05-08 02:59:41', '2019-05-08 02:59:41', 3),
(8, 5, 2, '2019-05-08 03:06:30', '2019-05-08 03:06:32', 3),
(10, 6, 1, '2019-05-08 16:36:45', '2019-05-08 16:36:45', 2),
(11, 6, 1, '2019-05-08 16:37:14', '2019-05-08 16:37:14', 9),
(12, 6, 1, '2019-05-08 16:37:16', '2019-05-08 16:37:16', 4),
(13, 7, 1, '2019-05-11 19:02:06', '2019-05-11 19:02:06', 6),
(14, 7, 1, '2019-05-11 19:02:18', '2019-05-11 19:02:18', 2),
(22, 12, 1, '2019-05-14 02:30:10', '2019-05-14 02:30:10', 2),
(23, 12, 2, '2019-05-14 02:30:12', '2019-05-14 02:30:15', 17),
(24, 12, 1, '2019-05-14 02:30:17', '2019-05-14 02:30:17', 7),
(25, 13, 1, '2019-05-15 18:00:30', '2019-05-15 18:00:30', 7),
(26, 13, 1, '2019-05-15 18:00:32', '2019-05-15 18:00:32', 16),
(27, 13, 1, '2019-05-15 18:00:36', '2019-05-15 18:00:36', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `birthday` date NOT NULL,
  `field` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` int(11) NOT NULL,
  `admin` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `name`, `password`, `birthday`, `field`, `address`, `contact`, `admin`, `created_at`, `updated_at`) VALUES
(64, 'veledjokic@gmail.com', 'Veljko', '$2y$10$HmHIg7dbJvKfxbiYDR82des1Uk8BVn90J88Jf1jDj/4ldQITNAkqi', '1999-02-13', 'Menagement', 'Zagrebacka 15', 667878232, 1, '2019-05-04 15:35:47', '2019-05-04 15:35:47'),
(66, 'konobar@konobar.rs', 'Konobar', '$2y$10$0k3Eve3p.3eby4c10itI3Off3IoMtSGv//iVtQ57wZ9tQ3fmIuAc6', '2017-05-17', 'sdadad', 'dasdasd', 2124120, 0, '2019-05-11 20:16:23', '2019-05-11 20:16:23');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `goods`
--
ALTER TABLE `goods`
  ADD PRIMARY KEY (`id`),
  ADD KEY `goods_category_id_foreign` (`category_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoices_user_id_foreign` (`user_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `portions`
--
ALTER TABLE `portions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `portions_goods_id_foreign` (`goods_id`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tickets_invoice_id_foreign` (`invoice_id`),
  ADD KEY `tickets_portion_id_foreign` (`portion_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `goods`
--
ALTER TABLE `goods`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `portions`
--
ALTER TABLE `portions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `goods`
--
ALTER TABLE `goods`
  ADD CONSTRAINT `goods_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `portions`
--
ALTER TABLE `portions`
  ADD CONSTRAINT `portions_goods_id_foreign` FOREIGN KEY (`goods_id`) REFERENCES `goods` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tickets_portion_id_foreign` FOREIGN KEY (`portion_id`) REFERENCES `portions` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
