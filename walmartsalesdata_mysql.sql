create database if not exists walmartdatasales;
use walmartdatasales;
create table if not exists salesdata(
invoice_id varchar(30) not null primary key,
branch varchar(10) not null,
city varchar(20) not null,
Customer_type varchar(50) not null,
gender varchar(50) not null,
product_line varchar(45) not null,
unit_price decimal(10,2) not null,
Quantity int not null,
VAT Float(6,4) not null,
Total Decimal(12,4) not null,
date datetime not null,
Time time not null,
Payment_method varchar(15) not null,
cogs decimal(10,2) not null,
gross_margin_percentage float(11,9) not null,
gross_income decimal (12,4) not null,
rating float(2,1) not null
);





-- ----------------------------------------------------------------------------------------------------------------------
-- -----------------------------------------------------Feature Engineering----------------------------------------------

--  add time_of_day  column --------------------



select time from salesdata;
SELECT
	time,
	(CASE
		WHEN `time` BETWEEN "00:00:00" AND "12:00:00" THEN "Morning"
        WHEN `time` BETWEEN "12:01:00" AND "16:00:00" THEN "Afternoon"
        ELSE "Evening"
    END) AS time_of_day
FROM salesdata;

Alter table salesdata add column time_Of_day varchar(20);
update salesdata
 set time_of_day =(
 CASE
		WHEN `time` BETWEEN "00:00:00" AND "12:00:00" THEN "Morning"
        WHEN `time` BETWEEN "12:01:00" AND "16:00:00" THEN "Afternoon"
        ELSE "Evening"
    END);
  
  
  
  -- ---------add day_name column ------
  
SELECT
	date,
	DAYNAME(date)
FROM salesdata;

alter table salesdata add column day_name varchar(10);

update salesdata 
set day_name = dayname(date);


-- ----- add month_name column------

select date,
monthname(date) from salesdata;

alter table salesdata add column month_name varchar(20);

update salesdata
set month_name = monthname(date);


-- ---------------------------------------------------------------------------------------------------------------------------------------
--  ----------------------------------------------------------- Generic ------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------

-- How many unique cities does the data have?
select distinct city from salesdata;

-- In which city is each branch?
select distinct branch from  salesdata;

-- -----------------------------------------------------------------------------------------------------------------------------------------
-- --------------------------------------------- product -----------------------------------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------------------------------------

-- How many unique product lines does the data have?
select count(distinct product_line )from salesdata;

-- -- what is the most common payment method?
select payment_method ,count(payment_method) as cnt from salesdata group by payment_method order by cnt desc;
-- -- what is the most selling product line?
select product_line, count(product_line) as cnt from salesdata group by  product_line order by cnt desc;

-- what is the total revenue by month?
select month_name as month , sum(total) as total_revenue from salesdata group by month order by total_revenue desc;

-- ---- What month had the largest COGS?
select month_name as month ,sum(cogs) as cogs from salesdata group by month_name order by cogs desc;

-- What product line had the largest revenue?
select product_line ,sum(total) as total_revenue from salesdata group by product_line order by total_revenue desc;

-- What is the city with the largest revenue?
select city,branch ,sum(total) as total_revenue from salesdata group by city ,branch
order by total_revenue desc;

-- -- What product line had the largest VAT?
select product_line ,avg(VAT) as avg_tax  from salesdata group by product_line order by avg_tax desc;

-- Fetch each product line and add a column to those product 
-- line showing "Good", "Bad". Good if its greater than average sales

SELECT 
	AVG(quantity) AS avg_qnty
FROM salesdata;

SELECT
	product_line,
	CASE
		WHEN avg(quantity) > 6 THEN "Good"
        ELSE "Bad"
    END AS remark
FROM salesdata
GROUP BY product_line;

-- Which branch sold more products than average product sold?
SELECT 
	branch, 
    SUM(quantity) AS qnty
FROM salesdata
GROUP BY branch
HAVING SUM(quantity) > (SELECT AVG(quantity) FROM salesdata);

-- What is the most common product line by gender
SELECT
	gender,
    product_line,
    COUNT(gender) AS total_cnt
FROM salesdata
GROUP BY gender, product_line
ORDER BY total_cnt DESC;

-- What is the average rating of each product line
SELECT
	ROUND(AVG(rating), 2) as avg_rating,
    product_line
FROM salesdata
GROUP BY product_line
ORDER BY avg_rating DESC;

-- --------------------------------------------------------------------
-- --------------------------------------------------------------------

-- --------------------------------------------------------------------
-- -------------------------- Customers -------------------------------
-- --------------------------------------------------------------------

-- How many unique customer types does the data have?
SELECT
	DISTINCT customer_type
FROM salesdata;

-- How many unique payment methods does the data have?
SELECT
	DISTINCT payment_method
FROM salesdata;

-- What is the most common customer type?
SELECT
	customer_type,
	count(*) as count
FROM salesdata
GROUP BY customer_type
ORDER BY count DESC;

-- Which customer type buys the most?
SELECT
	customer_type,
    COUNT(*)
FROM salesdata
GROUP BY customer_type;

-- What is the gender of most of the customers?
SELECT
	gender,
	COUNT(*) as gender_cnt
FROM salesdata
GROUP BY gender
ORDER BY gender_cnt DESC;

-- What is the gender distribution per branch?
SELECT
	gender,
	COUNT(*) as gender_cnt
FROM salesdata
WHERE branch = "C"
GROUP BY gender
ORDER BY gender_cnt DESC;

-- Gender per branch is more or less the same hence, I don't think has
-- an effect of the sales per branch and other factors.

-- Which time of the day do customers give most ratings?
SELECT
	time_of_day,
	AVG(rating) AS avg_rating
FROM salesdata
GROUP BY time_of_day
ORDER BY avg_rating DESC;

-- Looks like time of the day does not really affect the rating, its
-- more or less the same rating each time of the day.alter


-- Which time of the day do customers give most ratings per branch?
SELECT
	time_of_day,
	AVG(rating) AS avg_rating
FROM salesdata
WHERE branch = "A"
GROUP BY time_of_day
ORDER BY avg_rating DESC;

-- Branch A and C are doing well in ratings, branch B needs to do a 
-- little more to get better ratings.


-- Which day fo the week has the best avg ratings?
SELECT
	day_name,
	AVG(rating) AS avg_rating
FROM salesdata
GROUP BY day_name 
ORDER BY avg_rating DESC;

-- Mon, Tue and Friday are the top best days for good ratings
-- why is that the case, how many sales are made on these days?



-- Which day of the week has the best average ratings per branch?
SELECT 
	day_name,
	COUNT(day_name) total_sales
FROM salesdata
WHERE branch = "C"
GROUP BY day_name
ORDER BY total_sales DESC;

-- --------------------------------------------------------------------
-- --------------------------------------------------------------------

-- --------------------------------------------------------------------
-- ---------------------------- Sales ---------------------------------
-- --------------------------------------------------------------------

-- Number of sales made in each time of the day per weekday 
SELECT
	time_of_day,
	COUNT(*) AS total_sales
FROM salesdata
WHERE day_name = "Sunday"
GROUP BY time_of_day 
ORDER BY total_sales DESC;
-- Evenings experience most sales, the stores are 
-- filled during the evening hours

-- Which of the customer types brings the most revenue?
SELECT
	customer_type,
	SUM(total) AS total_revenue
FROM salesdata
GROUP BY customer_type
ORDER BY total_revenue;

-- Which city has the largest tax/VAT percent?
SELECT
	city,
    ROUND(AVG(VAT), 2) AS avg_tax_pct
FROM salesdata
GROUP BY city 
ORDER BY avg_tax_pct DESC;

-- Which customer type pays the most in VAT?
SELECT
	customer_type,
	AVG(VAT) AS total_tax
FROM salesdata
GROUP BY customer_type
ORDER BY total_tax;

-- -------------------------------------------------------------------------------------------------------------------
-- -------------------------------------------------------------------------------------------------------------------

